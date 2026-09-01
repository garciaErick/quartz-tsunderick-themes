//! The `sync` subcommand — fetch the base repo and merge it into the fork,
//! with the semantic config resolver and the fork-identity guard wired in.
//!
//! Flow (issue #5, Phase 1e, amended by the Phase 0 clobber finding):
//! 1. preflight: clean work tree, no merge in progress
//! 2. `git fetch base`
//! 3. `git merge --no-commit --no-ff <ref>`
//! 4. if `quartz.config.yaml` is conflicted: resolve semantically (3 stages
//!    from the index) and stage the result
//! 5. **fork-identity guard**: restore-ours on `README.md` and
//!    `content/index.md` — `merge=ours` gitattributes only fire on conflicts,
//!    so one-sided base changes would otherwise silently replace fork-owned
//!    files with a clean take-theirs
//! 6. `npm install` to reconcile the lockfile if the merge changed
//!    `package.json` (set `QUARTZ_SYNC_SKIP_NPM=1` to skip)
//! 7. auto-commit clean syncs with a SHA-range message; exit nonzero with
//!    tailored guidance otherwise. Rollback at every step is `git merge
//!    --abort` / `git revert`.

use std::process::{Command, Stdio};

use crate::driver;

const CONFIG_PATH: &str = "quartz.config.yaml";
const FORK_IDENTITY_PATHS: [&str; 2] = ["README.md", "content/index.md"];

fn git_capture(args: &[&str]) -> Result<String, String> {
    let out = Command::new("git")
        .args(args)
        .stderr(Stdio::null())
        .output()
        .map_err(|e| format!("cannot run git: {e}"))?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
        Err(if err.is_empty() {
            format!("git {} failed", args.join(" "))
        } else {
            err
        })
    }
}

fn git_status(args: &[&str]) -> i32 {
    Command::new("git")
        .args(args)
        .status()
        .map(|s| s.code().unwrap_or(1))
        .unwrap_or(1)
}

fn unmerged_paths(path_filter: Option<&str>) -> Vec<String> {
    let mut args = vec!["ls-files", "--unmerged"];
    if let Some(p) = path_filter {
        args.push("--");
        args.push(p);
    }
    let out = git_capture(&args).unwrap_or_default();
    // lines: "<mode> <sha> <stage>\t<path>" — dedupe paths
    let mut paths: Vec<String> = Vec::new();
    for line in out.lines() {
        if let Some(p) = line.split('\t').nth(1)
            && !paths.iter().any(|x| x == p)
        {
            paths.push(p.to_string());
        }
    }
    paths
}

fn stage_blob(spec: &str) -> Option<String> {
    git_capture(&["show", spec]).ok().filter(|s| !s.is_empty())
}

/// Returns the process exit code.
pub fn run(refspec: &str) -> i32 {
    // ── preflight ────────────────────────────────────────────────────────
    if let Err(e) = git_capture(&["rev-parse", "--show-toplevel"]) {
        eprintln!("quartz-sync sync: not inside a git work tree ({e})");
        return 1;
    }
    if let Ok(prefix) = git_capture(&["rev-parse", "--show-prefix"])
        && !prefix.is_empty()
    {
        eprintln!("quartz-sync sync: run from the repo root (currently in {prefix}/)");
        return 1;
    }
    if git_capture(&["rev-parse", "-q", "--verify", "MERGE_HEAD"]).is_ok() {
        eprintln!(
            "quartz-sync sync: a merge is already in progress — finish it (git commit / git merge --abort) first"
        );
        return 1;
    }
    match git_capture(&["status", "--porcelain"]) {
        Ok(s) if s.is_empty() => {}
        Ok(s) => {
            eprintln!("quartz-sync sync: work tree is not clean — commit or stash first:");
            eprintln!("{s}");
            return 1;
        }
        Err(e) => {
            eprintln!("quartz-sync sync: {e}");
            return 1;
        }
    }
    if git_capture(&["remote", "get-url", "base"]).is_err() {
        eprintln!(
            "quartz-sync sync: no `base` remote — register it with:\n  git remote add base https://github.com/garciaErick/quartz-tsunderick-themes.git"
        );
        return 1;
    }

    // ── fetch + resolve ref ──────────────────────────────────────────────
    println!("quartz-sync sync: fetching base…");
    if let Err(e) = git_capture(&["fetch", "base"]) {
        eprintln!("quartz-sync sync: git fetch base failed: {e}");
        return 1;
    }
    let ref_name = if refspec.contains('/') {
        refspec.to_string()
    } else {
        format!("base/{refspec}")
    };
    let target = match git_capture(&["rev-parse", "--verify", &ref_name]) {
        Ok(sha) => sha,
        Err(_) => {
            eprintln!(
                "quartz-sync sync: cannot resolve {ref_name} (fetched refs: run `git branch -r` to list)"
            );
            return 1;
        }
    };
    let short_target =
        git_capture(&["rev-parse", "--short", &target]).unwrap_or_else(|_| target.clone());
    let merge_base = match git_capture(&["merge-base", "HEAD", &target]) {
        Ok(mb) => mb,
        Err(e) => {
            eprintln!("quartz-sync sync: no common history with {ref_name}: {e}");
            return 1;
        }
    };
    let short_base =
        git_capture(&["rev-parse", "--short", &merge_base]).unwrap_or_else(|_| merge_base.clone());
    if merge_base == target {
        println!("quartz-sync sync: already up to date with {ref_name} ({short_target})");
        return 0;
    }

    // ── merge ────────────────────────────────────────────────────────────
    println!("quartz-sync sync: merging {ref_name} ({short_base}..{short_target})…");
    let merge_code = git_status(&["merge", "--no-commit", "--no-ff", &target]);
    if merge_code != 0 && merge_code != 1 {
        eprintln!(
            "quartz-sync sync: merge failed outright (exit {merge_code}) — the work tree is untouched; inspect `git merge` output above"
        );
        return 1;
    }

    // ── semantic config resolution ───────────────────────────────────────
    if !unmerged_paths(Some(CONFIG_PATH)).is_empty() {
        let ancestor = stage_blob(&format!(":1:{CONFIG_PATH}")).unwrap_or_default();
        let ours = stage_blob(&format!(":2:{CONFIG_PATH}")).unwrap_or_default();
        let theirs = stage_blob(&format!(":3:{CONFIG_PATH}")).unwrap_or_default();
        match driver::resolve(&ancestor, &ours, &theirs) {
            Ok((merged, warnings)) => {
                for w in &warnings {
                    eprintln!("⚠ {w}");
                }
                if let Err(e) = std::fs::write(CONFIG_PATH, &merged) {
                    eprintln!("quartz-sync sync: cannot write {CONFIG_PATH}: {e}");
                    return 1;
                }
                if let Err(e) = git_capture(&["add", CONFIG_PATH]) {
                    eprintln!("quartz-sync sync: cannot stage {CONFIG_PATH}: {e}");
                    return 1;
                }
                println!(
                    "quartz-sync sync: {CONFIG_PATH} resolved semantically ({} warning(s))",
                    warnings.len()
                );
            }
            Err(e) => {
                eprintln!("quartz-sync sync: semantic resolution failed: {e}");
                eprintln!(
                    "resolve {CONFIG_PATH} manually (git diff / conflict markers), then `git add {CONFIG_PATH}` and `git commit`"
                );
                return 1;
            }
        }
    }

    // ── fork-identity guard (the merge=ours clobber hole) ────────────────
    for path in FORK_IDENTITY_PATHS {
        if git_capture(&["cat-file", "-e", &format!("HEAD:{path}")]).is_ok() {
            let changed = git_capture(&["diff", "--name-only", "HEAD", "--", path])
                .map(|s| !s.is_empty())
                .unwrap_or(false);
            if changed {
                if git_capture(&[
                    "restore",
                    "--source=HEAD",
                    "--staged",
                    "--worktree",
                    "--",
                    path,
                ])
                .is_ok()
                {
                    println!("quartz-sync sync: kept fork's {path} (fork-identity guard)");
                } else {
                    eprintln!("quartz-sync sync: warning — could not restore {path}");
                }
            }
        }
    }

    // ── lockfile reconciliation ──────────────────────────────────────────
    let package_json_changed = git_capture(&[
        "diff",
        "--cached",
        "--name-only",
        "HEAD",
        "--",
        "package.json",
    ])
    .map(|s| !s.is_empty())
    .unwrap_or(false);
    if package_json_changed && std::path::Path::new("package.json").exists() {
        if std::env::var("QUARTZ_SYNC_SKIP_NPM").is_ok() {
            eprintln!(
                "quartz-sync sync: QUARTZ_SYNC_SKIP_NPM set — skipping npm install (lockfile not reconciled)"
            );
        } else {
            println!(
                "quartz-sync sync: package.json changed — running npm install to reconcile the lockfile…"
            );
            let code = Command::new("npm")
                .arg("install")
                .status()
                .map(|s| s.code().unwrap_or(1))
                .unwrap_or(1);
            if code != 0 {
                eprintln!(
                    "quartz-sync sync: npm install failed (exit {code}) — fix the environment, then re-run `npm install`, `git add package-lock.json`, and `git commit` (or `git merge --abort` to roll back)"
                );
                return 1;
            }
            let _ = git_capture(&["add", "package-lock.json"]);
        }
    }

    // ── remaining conflicts? ─────────────────────────────────────────────
    let still_unmerged = unmerged_paths(None);
    if !still_unmerged.is_empty() {
        eprintln!("quartz-sync sync: unresolved conflicts remain:");
        for p in &still_unmerged {
            eprintln!("  · {p}");
        }
        eprintln!(
            "resolve them (keep yours for fork-owned files), `git add` each, then `git commit` — or `git merge --abort` to roll back"
        );
        return 1;
    }

    // ── commit the sync point ────────────────────────────────────────────
    let nothing_staged = git_capture(&["diff", "--cached", "--quiet", "HEAD"]).is_ok();
    if nothing_staged {
        let _ = git_capture(&["merge", "--abort"]);
        println!("quartz-sync sync: merge produced no changes — nothing to commit");
        return 0;
    }
    let message = format!("sync: base {short_base}..{short_target}");
    let code = Command::new("git")
        .args(["commit", "-m", &message])
        .status()
        .map(|s| s.code().unwrap_or(1))
        .unwrap_or(1);
    if code != 0 {
        eprintln!(
            "quartz-sync sync: git commit failed (exit {code}) — everything is staged; finish with `git commit` manually"
        );
        return 1;
    }
    println!("quartz-sync sync: done — {message} (push when ready; push = deploy)");
    0
}
