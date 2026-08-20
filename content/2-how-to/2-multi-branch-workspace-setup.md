# Multi-branch Workspace Setup

Set up a multi-worktree workspace where each branch (`main`, `docs`, `tsunderick`, `robomario`, `azva01`, `mean-bean`, etc.) gets its own directory. This lets you have multiple branches checked out simultaneously without switching.

## TOC

<!-- mtoc-start -->

* [Final Structure](#final-structure)
* [Why](#why)
* [Quick Setup](#quick-setup)
* [Adding More Worktrees Later](#adding-more-worktrees-later)
* [Removing a Worktree](#removing-a-worktree)
* [Manual Setup (Without the Script)](#manual-setup-without-the-script)
* [How the Script Works](#how-the-script-works)

<!-- mtoc-end -->

## Final Structure

After setup, your workspace looks like this:

```
indie-seishun/          ← parent folder (NOT a git repo)
├── main/               ← main branch (the git repo, .git lives here)
├── docs/               ← worktree → docs branch
├── tsunderick/         ← worktree → tsunderick branch
├── robomario/          ← worktree → robomario branch
├── azva01/             ← worktree → azva01 branch
├── mean-bean/          ← worktree → mean-bean branch
└── ...
```

Each directory is a full checkout of that branch — open it in Godot, edit files, run the game independently.

## Why

| Problem | Solution |
|---------|----------|
| Can only have one branch checked out at a time — switching is slow | Worktrees for simultaneous checkouts |
| New team members need manual setup | Idempotent `setup-workspace.sh` script |

## Quick Setup

```bash
# Clone the repo (with submodules for the Importality addon)
git clone --recurse-submodules https://github.com/Indie-Seishun/indie-seishun.git
cd indie-seishun

# Run the workspace setup script
./scripts/dev-tools/setup-workspace.sh
```

The script:

1. Restructures the cloned repo into a parent folder (moves `indie-seishun/` → `indie-seishun/main/`)
2. Initializes git submodules in the main repo
3. Fetches remote branches
4. Creates worktrees for `docs`, `tsunderick`, `robomario`, `azva01`, and `mean-bean` as sibling directories
5. Initializes submodules inside each worktree

**Safe to re-run** — it detects if steps are already done and skips them.

## Adding More Worktrees Later

```bash
./scripts/dev-tools/setup-workspace.sh --branch azva01
```

## Removing a Worktree

```bash
git worktree remove /path/to/indie-seishun/<branch-name>
```

## Manual Setup (Without the Script)

If you prefer to do it manually:

```bash
# Restructure into parent folder
mv ~/path/to/indie-seishun ~/path/to/indie-seishun-temp
mkdir ~/path/to/indie-seishun
mv ~/path/to/indie-seishun-temp ~/path/to/indie-seishun/main

# Add a worktree
cd ~/path/to/indie-seishun/main
git fetch origin robomario
git branch robomario origin/robomario
git worktree add ../robomario robomario

# Initialize submodules
git submodule update --init --recursive
```

## How the Script Works

The setup script (`scripts/dev-tools/setup-workspace.sh`) is idempotent — it detects the current state and only runs what's needed:

1. **Detection** — checks if you're already inside a restructured workspace (directory named `main` with an `indie-seishun` parent) or a fresh clone
2. **Restructure** — if fresh, moves the repo into a `main/` subdirectory inside a new parent folder
3. **Submodule init** — runs `git submodule update --init --recursive` if `.gitmodules` exists
4. **Worktree creation** — for each configured branch, creates a local branch tracking remote and adds a worktree
5. **Worktree submodule init** — initializes submodules inside each worktree that has a `.gitmodules`

The default worktree branches are: `docs`, `tsunderick`, `robomario`, `azva01`, and `mean-bean`. Add more with `--branch <name>`.
