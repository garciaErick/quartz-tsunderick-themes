# New employee guide

## TOC

<!-- mtoc-start -->

* [Setup your environment](#setup-your-environment)
  * [Devs](#devs)
  * [1. Install Godot 4.6.2](#1-install-godot-462)
  * [2. Clone the Repository](#2-clone-the-repository)
  * [3. Workspace Setup (Optional)](#3-workspace-setup-optional)
  * [4. Install Aseprite & Configure Importality](#4-install-aseprite--configure-importality)
  * [5. Pre-commit Hooks](#5-pre-commit-hooks)
* [Folder Structure](#folder-structure)
* [Contributing Workflow](#contributing-workflow)
  * [Step 1: Day-to-Day — Keep Your Branch Synced with main](#step-1-day-to-day--keep-your-branch-synced-with-main)
  * [Step 2: When Your Work Is Ready — Create a Pull Request](#step-2-when-your-work-is-ready--create-a-pull-request)
  * [Step 3: After Your PR Is Merged — Reset Your Branch](#step-3-after-your-pr-is-merged--reset-your-branch)
* [Documentation](#documentation)
  * [How-To Guides](#how-to-guides)
  * [Design Docs](#design-docs)
  * [Generated Docs](#generated-docs)
  * [Codebase Patterns](#codebase-patterns)
* [Tools and Technologies](#tools-and-technologies)
  * [Game Engine](#game-engine)
  * [Graphics and Design](#graphics-and-design)
  * [Version Control](#version-control)
* [Contributors](#contributors)

<!-- mtoc-end -->

## Setup your environment

### Devs

### 1. Install Godot 4.6.2

Download and install **Godot 4.6.2 stable** from [godotengine.org](https://godotengine.org/download). The project uses Godot 4.6.2 features and will not work with older versions.

### 2. Clone the Repository

```bash
# --recurse-submodules fetches the Importality addon automatically
git clone --recurse-submodules https://github.com/Ashfall-Software/brews-n-battles.git
cd brews-n-battles
```

> **Forgot `--recurse-submodules`?** No problem — run this inside the repo:
>
> ```bash
> git submodule update --init --recursive
> ```

### 3. Workspace Setup (Optional)

The project supports a multi-worktree (branches) workspace
so each branch (`main`, `docs`, `tsunderick`, `robomario`, etc.) has its own
directory. The script also initializes git submodules in the main
repo and each worktree automatically.

```bash
# From the cloned repo root (which becomes main/)
./scripts/dev-tools/setup-workspace.sh
```

This restructures your clone into:

```
indie-seishun/          ← parent folder
├── main/               ← main branch (the git repo)
├── docs/               ← worktree → docs branch
├── tsunderick/         ← worktree → tsunderick branch
├── robomario/          ← worktree → robomario branch
└── ...
```

### 4. Install Aseprite & Configure Importality

1. Install [Aseprite](https://www.aseprite.org/) for pixel art and sprite animations
2. In Godot, go to **Editor → Editor Settings → General**
3. Search for **Importality**
4. Set **Aseprite command path** to your Aseprite executable
5. Set **Temp files path** to `/tmp`

### 5. Pre-commit Hooks

Pre-commit hooks automatically run `gdformat` (formatter) and `gdlint` (linter) on every `git commit`. **These hooks are local-only** — they live in `.git/hooks/` which is never tracked by Git, so they won't run in GitHub Actions (CI handles linting separately).

Quick setup:

```bash
# Install uv (if you don't have it)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create and activate virtual environment
uv venv
source .venv/bin/activate

# Install dev dependencies (pre-commit + gdtoolkit)
uv pip install -r requirements-dev.txt

# Activate the hook
pre-commit install
```

See the full guide: **[Pre-commit Setup](docs/how-to/1-pre-commit-setup.md)**

## Folder Structure

```
game/
├── addons/                    # Godot plugins
├── assets/                    # Imported game assets
├── scenes/                    # Godot scenes (.tscn)
│   ├── characters/players/   # Player scenes & states
│   ├── characters/npcs/      # NPC scenes & states
│   ├── hud/                  # UI screens (start screen, life bar)
│   ├── objects/              # Tables, drinks, etc.
│   └── stages/               # Level scenes
├── scripts/
│   ├── constants/            # Global constants, Factory, ComponentNames
│   └── shared/               # Reusable components & state machine
└── project.godot             # Main project config
```

## Contributing Workflow

All changes go through **Pull Requests** — never commit directly to `main`. Your personal branch (`robomario`, `tsunderick`, `mean-bean`, `azva01`, etc.) is your workspace. Here's the full contribution lifecycle:

### Step 1: Day-to-Day — Keep Your Branch Synced with main

While you're working on your branch, `main` keeps moving forward as other contributors merge their PRs. You should sync **regularly** (daily or at the start of each work session) so your branch doesn't drift too far from `main`.

Use the **reconcile script** — it preserves all your work (both committed and uncommitted) while pulling in the latest `main`:

```bash
# From your branch (e.g., robomario, tsunderick, etc.)
./scripts/github-workflows/sync-with-main-and-reconcile-changes.sh
```

**What it does step-by-step:**

1. Stashes any uncommitted changes temporarily (tracked and untracked files)
2. Rebases your local commits onto the latest `main` — your commit history is preserved
3. Restores your stashed changes and auto-commits them
4. Pushes everything to your remote branch

**When to use this:**

- ✅ You have work in progress you want to keep
- ✅ Start-of-day sync to pull in changes your teammates merged
- ✅ You want to commit and push your current changes alongside syncing
- ❌ Your changes aren't ready to be committed yet
- ❌ You have merge conflicts you're not ready to resolve

### Step 2: When Your Work Is Ready — Create a Pull Request

Once your feature or fix is complete and tested on your branch, it's time to contribute it back to `main`. See the full guide at **[How to Create a Pull Request](docs/how-to/3-create-a-pull-request-pr.md)** — here's the summary:

1. **Sync with main first** using the [reconcile script](./scripts/github-workflows/sync-with-main-and-reconcile-changes.sh) from Step 1 to make sure your branch is up-to-date
2. Go to [GitHub → indie-seishun](https://github.com/Indie-Seishun/indie-seishun) — you should see a **"Compare & pull request"** button
3. Verify the direction:
   - **Base:** `main` ← the target
   - **Compare:** `<your-branch>` ← your work
4. Title your PR with the issue number and summary: `[ISSUE-123] - Add Health System with HUD display`
5. Write a brief description of what your changes do and why
6. Click **"Create pull request"**

**After review, if changes are requested:**

```bash
# Make the requested changes in your code, then:
git add .
git commit -m "Address review feedback: fix X, Y, Z"
git push origin <your-branch>
```

The PR will automatically update with your new commit. No need to close and reopen anything.

> **No local dev environment?** If you only need to add or replace asset files (like sprites), you can do it entirely from the GitHub website — no Git or Godot required. See **[Upload a file via GitHub Web](docs/how-to/5-upload-file-via-github-web.md)** for the step-by-step guide.

### Step 3: After Your PR Is Merged — Reset Your Branch

Once your PR is approved and merged into `main`, your branch still contains the old commits that are now also in `main`. This is the right time to **nuclear reset** your branch so it's clean and identical to `main` before you start your next feature:

```bash
./scripts/github-workflows/sync-with-main-NUCLEAR.sh
```

**What it does step-by-step:**

1. Stashes any uncommitted changes (recoverable via `git stash pop stash@{0}`)
2. Shows you which local commits will be deleted and asks for confirmation
3. **Permanently deletes** all local commits on your branch
4. Resets your branch (both local AND remote) to exactly match `main`
5. Force pushes the reset to your remote branch

**When to use this:**

- ✅ Your PR was just merged — reset to a clean slate for your next feature
- ✅ You want to start fresh from `main` and discard experimental work
- ✅ Your branch is in a broken state and you want to reset
- ❌ You have uncommitted work you want to keep (use `git stash` first or use the reconcile script instead)
- ❌ You have local commits that haven't been merged into `main` yet (they'll be **permanently destroyed**)

> ⚠️ **This is destructive.** All commits unique to your branch are permanently deleted. The script shows you exactly which commits will be lost and asks you to confirm before proceeding. Uncommitted changes are stashed and recoverable.

📖 For detailed testing scenarios and edge cases, see **[Sync with main guide](docs/how-to/4-sync-with-main-guide.md)**

## Documentation

To see our full documentation just head over to the [docs](./docs/) directory

### How-To Guides

The full listing is located here [/docs/how-to/](./docs/how-to/)

| Guide                                                                         | Description                                                                         |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [Pre-commit Setup](docs/how-to/1-pre-commit-setup.md)                         | Set up automated GDScript formatting and linting via Git pre-commit hooks           |
| [Multi-branch Workspace Setup](docs/how-to/2-multi-branch-workspace-setup.md) | Set up multi-worktree workspace with the setup script                               |
| [Create a Pull Request](docs/how-to/3-create-a-pull-request-pr.md)            | How to create PRs, handle review feedback, and squash commits before merge          |
| [Sync with main guide](docs/how-to/4-sync-with-main-guide.md)                 | Git workflow scripts for syncing your branch with main                              |
| [Upload a file via GitHub Web](docs/how-to/5-upload-file-via-github-web.md)   | Create directories, upload, or replace asset files directly from the GitHub website |
| [Update Importality Submodule](docs/how-to/x-update-importality-submodule.md) | Pull upstream updates for the Importality addon                                     |

### Design Docs

The full listing is located here [/docs/design-docs/](./docs/design-docs/)

| Document                                                                                                  | Description                                                                                            |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [1. Input & movement](docs/design-docs/1-input-and-movement-component-design-doc.md)                      | Godot input and movement component design                                                              |
| [2. Health component](docs/design-docs/2-health-component-design-doc.md)                                  | Godot health component composition design                                                              |
| [3. Attack components](docs/design-docs/3-attack-components-design-doc.md)                                | Bar game attack system design                                                                          |
| [4. Chase & navigation](docs/design-docs/4-chase-and-navigation-design-doc.md)                            | Enemy AI chase and navigation design                                                                   |
| [5. Scene flow manager](docs/design-docs/5-scene-flow-manager-design-doc.md)                              | Enforced scene/level flow via the `FLOW_MANAGER` autoload, with an auto-generated flow graph           |
| [6. State machine & factory](docs/design-docs/6-state-machine-and-factory-design-doc.md)                  | State machine and factory architecture for managing game object states and centralized object creation |
| [x. NPC spawner & spawn point](docs/design-docs/x-npc-spawner-spawn-point-design-doc.md)                  | Data-driven enemy spawner system design                                                                |
| [7. HUD & game settings](docs/design-docs/7-hud-and-game-settings-design-doc.md)                          | Persistent settings and in-game HUD overlay design                                                     |
| [x. Drink crafting & serving](docs/design-docs/drink-crafting/x-drink-crafting-and-serving-design-doc.md) | Drink crafting and serving system design                                                               |
| [x. First level template](docs/design-docs/x-first-level-design-template.md)                              | Level 1 design template and mockup                                                                     |

### Generated Docs

The full listing is located here [/docs/generated-docs/](./docs/generated-docs/)

| Document                                              | Description                                                                                                                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Scene Flow Graph](docs/generated-docs/flow-graph.md) | Auto-generated level roadmap (mermaid + state→scene map). Source of truth: `_ALLOWED` in `flowManager.gd`. Regenerate via `./scripts/dev-tools/generate-flow-graph.sh` |

### Codebase Patterns

We use the [Factory](docs/design-docs/6-state-machine-and-factory-design-doc.md) and [StateMachine](docs/design-docs/6-state-machine-and-factory-design-doc.md) patterns. A more in-depth explanation can be found in the [State machine & factory design doc](docs/design-docs/6-state-machine-and-factory-design-doc.md).

We also use a **Component** pattern: characters are composed of nodes like `HealthComponent`, `InputComponent`, and `MovementComponent`. Per-character data (e.g. `maxHealth`) is authored **on the component node itself** via its `@export`, set in the scene Inspector — not on the character root script. See the [Health component design doc](docs/design-docs/2-health-component-design-doc.md) for the full breakdown.

We also enforce a **Scene Flow** via the `FLOW_MANAGER` autoload: scenes never call `change_scene_to_file()` directly, they go through `FLOW_MANAGER` which validates each transition against an allowed-flow table. The flow graph is auto-generated from that table — see the [Scene flow manager design doc](docs/design-docs/5-scene-flow-manager-design-doc.md) and the live graph at [`docs/generated-docs/flow-graph.md`](docs/generated-docs/flow-graph.md). Regenerate it with `./scripts/dev-tools/generate-flow-graph.sh`.

## Tools and Technologies

### Game Engine

- [Godot 4.6.2](https://godotengine.org/) - An open-source game engine for creating 2D and 3D games.

### Graphics and Design

- [Aseprite](https://www.aseprite.org/) - A pixel art tool for creating 2D animations and sprites.

### Version Control

- [GitHub Desktop](https://desktop.github.com/) - Focus on what matters instead of fighting with Git. Whether you're new to Git or a seasoned user, GitHub Desktop simplifies your development workflow.
- [lazygit](https://github.com/jesseduffield/lazygit)
- [GitHub Cli](https://cli.github.com/)

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://erick-garcia.com"><img src="https://avatars.githubusercontent.com/u/31434516?v=4" width="100px;" alt=""/><br /><sub><b>tsunderick</b></sub><br /><sub><b>Project Manager & Developer</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/slimmario04"><img src="https://avatars.githubusercontent.com/u/233818643?v=4" width="100px;" alt=""/><br /><sub><b>slimmario04</b></sub><br /><sub><b>Developer & Design</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Azva01"><img src="https://avatars.githubusercontent.com/u/152651812?v=4" width="100px;" alt=""/><br /><sub><b>Azva01</b></sub><br /><sub><b>Lead Designer</b></sub></a></td>
      <!-- <td align="center" valign="top" width="14.28%"><a href="https://github.com/LUIZAZUA"><img src="https://avatars.githubusercontent.com/u/40708253?v=4" width="100px;" alt=""/><br /><sub><b>LUIZAZUA</b></sub><br /><sub><b></b></sub></a></td> -->
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
