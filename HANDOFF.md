# HANDOFF — Fork-and-Sync Migration

This document is the umbrella for a planned (not yet started) architecture migration.
All substance lives in issues **#4–#8**; this file is the map. If the issues and this
file disagree, the issues win.

## Why we're migrating

This repo is currently an **engine** architecture: child sites consume it as a
submodule-pinned engine plus a compose pipeline. It serves exactly **2 sites**
(`7th-heaven.tsunderick.space`, `docs.ashfallsoftware.com`) but carries machinery
sized for a fleet: a 153-line `merge-config.ts` patched into the quartz core loader,
216 lines of compose shell (`build.sh`, `update-engine.sh`), config-layering merge
semantics, and starter templates.

Decision: replace with **fork-and-sync** — this repo becomes a simple forkable
**base**; each site becomes a self-contained repo that merges from it.

## Target model (the one-paragraph version)

Each site repo is a plain clone with a `base` remote (not a true GitHub fork — sites
live under two different owners, and fork semantics don't fit org placement). Updates
flow via merge from `base/main`, automated by a Rust CLI (`quartz-sync`) that ships
**in the base repo** at `tools/quartz-sync` and is inherited by each fork through its
conversion merge. House policy behind the Rust choice: owned tooling is Rust from day
one so it never needs a migration later.

**Invariant — sync ≠ build.** Rust exists only on the sync path. `npm ci && npx quartz
build` must work on a machine with zero Rust installed; Cloudflare CI never invokes
cargo; a fork that never syncs never compiles anything.

**Non-destructive by design.** Conversions are additive `--allow-unrelated-histories`
merges — no rebase, no history rewrite, same SHAs, rollback is `git revert` at every
step. Children pin old engine SHAs, so unconverted sites keep building until they
convert themselves.

## The issues, in execution order

| # | Issue | Scope | Gates |
|---|---|---|---|
| [#4](https://github.com/garciaErick/quartz-tsunderick-themes/issues/4) | Phase 0 — Recon | Read-only verification of every assumption (upstream loader diff, YAML crate pick, CI invocation, dependabot/workflows) | #5 — nothing starts until findings are posted as comments on #4 |
| [#5](https://github.com/garciaErick/quartz-tsunderick-themes/issues/5) | Phase 1 — Base conversion + `quartz-sync` | Strip layering patch & compose scripts → pristine quartz core; scaffold `tools/quartz-sync` (3-way merge core + `setup`/`driver`/`sync` CLI); `.gitattributes` ours-policies; cargo CI; README rewrite | #6 — forks inherit the toolkit through their conversion merge |
| [#6](https://github.com/garciaErick/quartz-tsunderick-themes/issues/6) | Phase 2 — Pilot conversion | Convert `7th-heaven.tsunderick.space` (smallest site) with the full recipe; end-to-end sync proof from a throwaway base branch; zero-Rust build parity; Cloudflare command simplification | #7 — the recipe is proven before it touches the big repo |
| [#7](https://github.com/garciaErick/quartz-tsunderick-themes/issues/7) | Phase 3 — Second conversion | Convert `docs.ashfallsoftware.com` (1,959 commits, running `sync-game-docs` automation) using the proven recipe | #8 — no old-engine consumer remains after this |
| [#8](https://github.com/garciaErick/quartz-tsunderick-themes/issues/8) | Phase 4 — Cleanup | Per-site sync-flow docs, stale dependabot branch triage, cross-repo final review | — |

Start at #4. Work strictly in order; each issue's checklist is the definition of done.

## Facts established during planning (don't re-derive)

- `7th-heaven.tsunderick.space`: 21 commits, 226 tracked files — almost entirely
  `content/`; extracted engine files in the working dir are **gitignored, not
  tracked**, so the conversion merge adds the engine tree cleanly. No `styles/`,
  `site-plugins/`, or `.site-subpath`. Its `quartz.config.yaml` is already
  full-ownership shaped (339 lines) — config materialization is nearly free.
- `docs.ashfallsoftware.com`: 1,959 commits; custom automation at
  `.github/workflows/sync-game-docs.yml`, `scripts/fetch-game-docs.sh`,
  `.game-docs-stamp` (child-owned paths; base deletes its own `scripts/` in Phase 1,
  so no merge conflict). Branding: `static/icon.png` + `static/og-image.png`.
- The base README claims an `upstream` remote is configured — it isn't (Phase 1a adds it).
- `serde_yaml` is `v0.9.34+deprecated`; the successor crate is a Phase 0 decision
  (needs parse → structure → emit with key-order preservation for the 3-way merge).
- Conversion-merge conflicts are limited to ~4 known files: `quartz.config.yaml`
  (the one real hand-resolve), `content/index.md`, `README.md`, `.gitignore`.
- `quartz.config.yaml` is the ongoing sync conflict hotspot — that's what the
  semantic 3-way resolver exists for. Everything else is handled by git-native
  `.gitattributes` ours-policies (homepage, README, lockfile, `.node-version`).

## Decision log (rejected alternatives, so nobody relitigates)

| Rejected | Why |
|---|---|
| Keep the engine architecture | Sized for 10+ sites / third-party consumers; the fleet is 2 personal sites |
| Node `.mjs` toolkit instead of Rust | House policy is Rust for owned tooling; a binary also removes the node_modules dependency at merge time |
| Marker-splice config resolver (`# >>> fork:keep`) | Fragile for scattered inline plugin toggles |
| Keep the layering loader as an option | The goal is a pristine quartz core and a smaller upstream merge surface |
| True GitHub forks for sites | Sites live under two owners; forks can't target orgs cleanly |
| Convert both sites simultaneously | Pilot-first proves the recipe before it touches the 1,959-commit repo |
| Branding kept in root `static/` + CI copy step | Direct placement in `quartz/static/`; binaries rarely conflict |

## Status

Created 2026-09-01, after planning sessions that produced issues #4–#8. All phases
**unstarted**. No migration code exists yet — the working tree is untouched. To begin:
assign yourself to #4, do the read-only recon, and record findings as comments there.
