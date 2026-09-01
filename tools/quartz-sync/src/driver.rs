//! The `driver` subcommand — git custom merge-driver entrypoint.
//!
//! Registered by `setup` as the `merge.quartz-config.driver` command:
//! `quartz-sync driver %O %A %B [%P]` where %O is the merge base, %A is the
//! fork's file (the one git will keep), %B is the base repo's file, and %P is
//! the path label. On success the merged document is written to %A and the
//! driver exits 0. On any failure it exits 1 — git then leaves normal
//! conflict markers in %A for manual resolution.

use std::path::Path;

use crate::{merge, yaml_io};

/// Parse three documents, merge them, and emit the result (with the fork's
/// leading comment block re-attached). Shared by `driver` and `merge`.
pub fn resolve(
    ancestor_raw: &str,
    ours_raw: &str,
    theirs_raw: &str,
) -> Result<(String, Vec<String>), String> {
    let ancestor = yaml_io::parse(ancestor_raw, "merge base (%O)").map_err(|e| e.to_string())?;
    let ours = yaml_io::parse(ours_raw, "fork config (%A)").map_err(|e| e.to_string())?;
    let theirs = yaml_io::parse(theirs_raw, "base config (%B)").map_err(|e| e.to_string())?;

    let out = merge::merge_configs(&ancestor.value, &ours.value, &theirs.value)
        .map_err(|e| e.to_string())?;
    let emitted = yaml_io::emit(&out.merged, &ours.leading_comments);
    Ok((emitted, out.warnings))
}

/// `driver %O %A %B [%P]` — returns the process exit code.
pub fn run(args: &[String]) -> i32 {
    if args.len() < 3 {
        eprintln!("usage: quartz-sync driver <base> <ours> <theirs> [label]");
        return 2;
    }
    let (ancestor_path, ours_path, theirs_path) = (&args[0], &args[1], &args[2]);
    let label = args
        .get(3)
        .cloned()
        .unwrap_or_else(|| "quartz.config.yaml".to_string());

    let read = |p: &String, what: &str| {
        std::fs::read_to_string(Path::new(p)).map_err(|e| format!("cannot read {what} ({p}): {e}"))
    };

    let (anc_raw, our_raw, thir_raw) = match (
        read(ancestor_path, "merge base %O"),
        read(ours_path, "fork file %A"),
        read(theirs_path, "base file %B"),
    ) {
        (Ok(a), Ok(o), Ok(t)) => (a, o, t),
        (Err(e), _, _) | (_, Err(e), _) | (_, _, Err(e)) => {
            eprintln!("quartz-sync driver: {e}");
            return 1;
        }
    };

    match resolve(&anc_raw, &our_raw, &thir_raw) {
        Ok((merged, warnings)) => {
            for w in &warnings {
                eprintln!("⚠ {w}");
            }
            if let Err(e) = std::fs::write(Path::new(ours_path), &merged) {
                eprintln!("quartz-sync driver: cannot write merged result to {ours_path}: {e}");
                return 1;
            }
            println!(
                "quartz-sync: semantically merged {label} ({} warning(s))",
                warnings.len()
            );
            0
        }
        Err(e) => {
            eprintln!("quartz-sync driver: {e}");
            eprintln!(
                "leaving git's conflict markers in {ours_path} — resolve manually, or inspect with `quartz-sync merge`"
            );
            1
        }
    }
}
