//! quartz-sync — the fork-and-sync toolkit for quartz-tsunderick-themes.
//!
//! House tooling is Rust from day one (no later migration), but Rust lives on
//! the SYNC path only: `npm ci && npx quartz build` never needs a Rust
//! toolchain (the sync ≠ build invariant).
//!
//! Subcommands:
//! - `setup`               register the merge driver + gitattributes policy (idempotent)
//! - `driver %O %A %B [%P]` git merge-driver entrypoint (semantic config resolve)
//! - `sync [ref] [--prefix <dir>]` fetch base and merge it in (default ref: base/main;
//!   `--prefix docs` for monorepo subtree forks)
//! - `merge <anc> <ours> <theirs>` one-off semantic merge, prints to stdout

mod driver;
mod merge;
mod setup;
mod sync;
mod yaml_io;

use std::process::ExitCode;

const USAGE: &str = "quartz-sync — fork-and-sync toolkit for quartz-tsunderick-themes

USAGE:
    quartz-sync setup                      # register merge driver + policy (idempotent)
    quartz-sync driver %O %A %B [%P]       # git merge-driver entrypoint
    quartz-sync sync [ref] [--prefix DIR]  # fetch base + merge (default: main -> base/main)
                                           # --prefix DIR: monorepo subtree fork (e.g. docs)
    quartz-sync merge <ancestor> <ours> <theirs>   # one-off semantic merge to stdout

NOTES:
    sync resolves quartz.config.yaml semantically on conflict, keeps the
    fork's README.md / content/index.md (identity guard), reconciles the
    lockfile with npm install when package.json changed (skip with
    QUARTZ_SYNC_SKIP_NPM=1), and auto-commits clean syncs as
    'sync: base <old>..<new>'. With --prefix, all of that happens inside the
    prefix directory and the merge is subtree-mapped (git -Xsubtree), so the
    rest of the monorepo is untouched. Zero Rust on the build path — this
    tool only ever runs at sync time.";

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let code = match args.first().map(String::as_str) {
        Some("setup") if args.len() == 1 => setup::run(),
        Some("driver") => driver::run(&args[1..]),
        Some("sync") if args.len() <= 4 => match parse_sync_args(&args[1..]) {
            Ok((refspec, prefix)) => sync::run(refspec, prefix),
            Err(e) => {
                eprintln!("quartz-sync sync: {e}\n\n{USAGE}");
                2
            }
        },
        Some("merge") if args.len() == 4 => merge_subcommand(&args[1..]),
        Some("--help") | Some("-h") | None => {
            println!("{USAGE}");
            0
        }
        _ => {
            eprintln!("{USAGE}");
            2
        }
    };
    ExitCode::from(code.clamp(0, 255) as u8)
}

/// Parse `sync` arguments: optional positional ref plus `--prefix <dir>`.
fn parse_sync_args(rest: &[String]) -> Result<(&str, Option<&str>), String> {
    let mut refspec: Option<&String> = None;
    let mut prefix: Option<&String> = None;
    let mut i = 0;
    while i < rest.len() {
        match rest[i].as_str() {
            "--prefix" => {
                let value = rest
                    .get(i + 1)
                    .ok_or("--prefix requires a value (e.g. --prefix docs)")?;
                prefix = Some(value);
                i += 2;
            }
            _ if rest[i].starts_with("--") => {
                return Err(format!("unknown flag {} (use: --prefix <dir>)", rest[i]));
            }
            _ if refspec.is_none() => {
                refspec = Some(&rest[i]);
                i += 1;
            }
            _ => return Err("expected at most one ref argument".to_string()),
        }
    }
    Ok((
        refspec.map(String::as_str).unwrap_or("main"),
        prefix.map(String::as_str),
    ))
}

fn merge_subcommand(paths: &[String]) -> i32 {
    let read = |p: &String| std::fs::read_to_string(p).map_err(|e| format!("cannot read {p}: {e}"));
    let (anc, our, thir) = match (read(&paths[0]), read(&paths[1]), read(&paths[2])) {
        (Ok(a), Ok(o), Ok(t)) => (a, o, t),
        (Err(e), _, _) | (_, Err(e), _) | (_, _, Err(e)) => {
            eprintln!("quartz-sync merge: {e}");
            return 1;
        }
    };
    match driver::resolve(&anc, &our, &thir) {
        Ok((merged, warnings)) => {
            for w in &warnings {
                eprintln!("⚠ {w}");
            }
            print!("{merged}");
            0
        }
        Err(e) => {
            eprintln!("quartz-sync merge: {e}");
            1
        }
    }
}
