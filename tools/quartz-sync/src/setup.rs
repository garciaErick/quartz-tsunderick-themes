//! The `setup` subcommand — one-time, idempotent fork-side registration.
//!
//! Registers the semantic config resolver as a git merge driver in the
//! repo's `.git/config` and ensures the `.gitattributes` policy line exists,
//! so a plain `git merge base/main` also gets semantic resolution for
//! `quartz.config.yaml`. (`quartz-sync sync` does not depend on this — it
//! resolves conflicts directly — but the driver makes vanilla git merges
//! behave identically.)

use std::path::PathBuf;
use std::process::Command;

fn git(args: &[&str]) -> Result<String, String> {
    let out = Command::new("git")
        .args(args)
        .output()
        .map_err(|e| format!("cannot run git: {e}"))?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/// Returns the process exit code.
pub fn run() -> i32 {
    let exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("quartz-sync setup: cannot locate own binary: {e}");
            return 1;
        }
    };
    let root = match git(&["rev-parse", "--show-toplevel"]) {
        Ok(r) if !r.is_empty() => PathBuf::from(r),
        _ => {
            eprintln!("quartz-sync setup: not inside a git work tree (are you in the fork repo?)");
            return 1;
        }
    };

    // 1. Register the merge drivers in .git/config (idempotent: replace-all).
    //    - `quartz-config`: the semantic resolver (this binary).
    //    - `ours`: NOT built into git (only text/binary/union are). The
    //      ours-policy lines in .gitattributes are inert without this
    //      conventional definition — `driver = true` exits 0 and leaves the
    //      fork's file untouched, which is exactly "keep ours".
    let driver_cmd = format!("{exe:?} driver %O %A %B %P");
    for (key, value) in [
        (
            "merge.quartz-config.name",
            "quartz-sync semantic 3-way config resolver",
        ),
        ("merge.quartz-config.driver", &driver_cmd),
        (
            "merge.ours.name",
            "keep the fork's version (quartz-sync fork-identity policy)",
        ),
        ("merge.ours.driver", "true"),
    ] {
        if let Err(e) = git(&["config", "--replace-all", key, value]) {
            eprintln!("quartz-sync setup: git config {key} failed: {e}");
            return 1;
        }
    }

    // 2. Ensure the .gitattributes policy line exists.
    let attrs_path = root.join(".gitattributes");
    let attr_line = "quartz.config.yaml merge=quartz-config";
    let existing = std::fs::read_to_string(&attrs_path).unwrap_or_default();
    if !existing.lines().any(|l| l.trim() == attr_line) {
        let mut next = existing.clone();
        if !next.is_empty() && !next.ends_with('\n') {
            next.push('\n');
        }
        next.push_str(attr_line);
        next.push('\n');
        if let Err(e) = std::fs::write(&attrs_path, next) {
            eprintln!(
                "quartz-sync setup: cannot write {}: {e}",
                attrs_path.display()
            );
            return 1;
        }
        println!(
            "quartz-sync setup: added `{attr_line}` to .gitattributes (commit it — it's fork-owned policy)"
        );
    } else {
        println!("quartz-sync setup: .gitattributes already has the policy line");
    }

    println!("quartz-sync setup: merge driver `quartz-config` registered -> {driver_cmd}");
    println!("quartz-sync setup: done (idempotent — safe to re-run after moving the binary)");
    0
}
