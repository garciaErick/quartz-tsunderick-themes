# Dev environment setup

## 1. Install Godot 4.6.2

Download and install **Godot 4.6.2 stable** from
[godotengine.org](https://godotengine.org/download). The project uses Godot 4.6.2
features and will not work with older versions.

## 2. Clone the Repository

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

## 3. Workspace Setup (Optional)

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

## 4. Install Aseprite & Configure Importality

1. Install [Aseprite](https://www.aseprite.org/) for pixel art and sprite animations
2. In Godot, go to **Editor → Editor Settings → General**
3. Search for **Importality**
4. Set **Aseprite command path** to your Aseprite executable
5. Set **Temp files path** to `/tmp`

## 5. Pre-commit Hooks

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

# Folder Structure

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
