# Pre-Commit Setup: GDScript Formatter & Linter

> This guide covers setting up automated GDScript formatting (`gdformat`) and linting (`gdlint`) via a Git pre-commit hook.

## TOC

<!-- mtoc-start -->

* [What Gets Installed](#what-gets-installed)
* [How It Works](#how-it-works)
* [One-Time Setup](#one-time-setup)
  * [Prerequisites](#prerequisites)
  * [Installing uv](#installing-uv)
  * [Step 1: Install the Tools](#step-1-install-the-tools)
  * [Step 2: Activate the Git Hook](#step-2-activate-the-git-hook)
  * [Step 3: Verify It Works](#step-3-verify-it-works)
* [Windows Setup (Additional Steps)](#windows-setup-additional-steps)
  * [Install uv](#install-uv)
  * [PATH Issues](#path-issues)
  * [Verify Tools Are Found](#verify-tools-are-found)
  * [Git Bash vs PowerShell vs CMD](#git-bash-vs-powershell-vs-cmd)
* [Formatting vs Linting — What's the Difference?](#formatting-vs-linting--whats-the-difference)
  * [Formatting Example (`gdformat`)](#formatting-example-gdformat)
  * [Linting Examples (`gdlint`)](#linting-examples-gdlint)
    * [Example 1: Wrong naming conventions](#example-1-wrong-naming-conventions)
    * [Example 2: Non-descriptive names and unused code](#example-2-non-descriptive-names-and-unused-code)
    * [Example 3: Wrong class and enum naming](#example-3-wrong-class-and-enum-naming)
  * [Why Both?](#why-both)
* [Daily Workflow](#daily-workflow)
  * [Bypassing the Hook (Emergency Only)](#bypassing-the-hook-emergency-only)
* [Manual Usage](#manual-usage)
* [Linter Configuration (`.gdlintrc`)](#linter-configuration-gdlintrc)
  * [What it configures](#what-it-configures)
  * [Modifying rules](#modifying-rules)
* [Troubleshooting](#troubleshooting)
  * [`pre-commit: command not found`](#pre-commit-command-not-found)
  * [`gdformat: command not found`](#gdformat-command-not-found)
  * [Hook doesn't run on commit](#hook-doesnt-run-on-commit)
  * [Hook runs on wrong files](#hook-runs-on-wrong-files)
  * [Updating Tools](#updating-tools)
  * [Reinstalling from Scratch](#reinstalling-from-scratch)
* [Optional: Godot Editor Extensions](#optional-godot-editor-extensions)

<!-- mtoc-end -->

## What Gets Installed

| Tool | Purpose | Provided By |
|------|---------|-------------|
| `pre-commit` | Git hook manager — runs checks before each commit | [pre-commit](https://pre-commit.com/) |
| `gdformat` | Auto-formats `.gd` files to Godot style | [gdtoolkit](https://github.com/Scony/godot-gdscript-toolkit) |
| `gdlint` | Checks `.gd` files for style issues | [gdtoolkit](https://github.com/Scony/godot-gdscript-toolkit) |

## How It Works

The `.pre-commit-config.yaml` in the project root defines two local hooks:

1. **Godot Formatter** (`gdformat`) — Runs first. Auto-formats all staged `.gd` files. If any files were changed by the formatter, the commit **fails** so you can re-stage the formatted files and commit again.
2. **Godot Linter** (`gdlint`) — Runs second. Checks all staged `.gd` files for style violations. If any issues are found, the commit **fails** with details on what to fix.

Both hooks only run on **staged** `.gd` files, so unchanged files are skipped. Files under `game/addons/` are **excluded** since they are third-party code we don't maintain.

## One-Time Setup

### Prerequisites

* **uv** installed on your system (see below)
* A Git clone of this repository

### Installing uv

**Linux / macOS:**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Windows (CMD):**

```cmd
pip install uv
```

> If you already have Python/pip, `pip install uv` works on any platform.

Verify it worked:

```bash
uv --version
```

### Step 1: Install the Tools

Create a virtual environment and install both `pre-commit` and `gdtoolkit`:

```bash
uv venv
source .venv/bin/activate
uv pip install -r requirements-dev.txt
```

This creates a `.venv` directory and installs `pre-commit`, `gdformat`, and `gdlint` into it. The `source .venv/bin/activate` line puts them on your PATH for the current shell session.

> **Note:** You'll need to activate the venv (`source .venv/bin/activate`) each time you open a new terminal. The git hook created in Step 2 will work without activation since it uses a hardcoded path.

### Step 2: Activate the Git Hook

```bash
pre-commit install
```

This reads `.pre-commit-config.yaml` and creates `.git/hooks/pre-commit`. You should see output like:

```
pre-commit installed at .git/hooks/pre-commit
```

### Step 3: Verify It Works

```bash
pre-commit run --all-files
```

This runs both hooks against every `.gd` file in the repo. On a clean codebase you'll see:

```
Godot Formatter.............................................................Passed
Godot Linter.................................................................Passed
```

> **Important:** The pre-commit hook lives in `.git/hooks/`, which is **never tracked by Git**. Every developer must run Steps 1–3 themselves after cloning the repo. Pulling new code does NOT automatically set up the hook. Point new contributors to this document.
>
## Windows Setup (Additional Steps)

If you're on Windows, follow the standard setup above but note these differences:

### Install uv

uv can be installed on Windows via PowerShell or pip:

**PowerShell (recommended):**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**pip (if you already have Python):**

```bash
pip install uv
```

**winget:**

```cmd
winget install astral-sh.uv
```

Verify with `uv --version`.

### PATH Issues

The tools are installed inside `.venv/`. Make sure you've activated the virtual environment:

```bash
source .venv/bin/activate
```

On **Windows PowerShell**, activation is:

```powershell
.venv\Scripts\Activate.ps1
```

If you get an execution policy error, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### Verify Tools Are Found

```powershell
pre-commit --version
gdformat --version
gdlint --version
```

If any of these say "command not found," the tool isn't on your PATH yet.

### Git Bash vs PowerShell vs CMD

The pre-commit hook works in **any** terminal that can run Git. However:

* **Git Bash** — Works out of the box, closest to Linux/macOS experience
* **PowerShell** — Works, but you may need to restart it after installing tools
* **CMD** — Works, but least tested

## Formatting vs Linting — What's the Difference?

Think of it like writing a paper:

* **Formatting** (`gdformat`) is like spell-check + consistent typography — it *rewrites* your code to look clean. Tabs not spaces, proper indentation, consistent spacing around operators. It **auto-fixes** everything for you.
* **Linting** (`gdlint`) is like a grammar checker — it flags *logic-level style problems* that can't be auto-fixed. Bad variable names, unused variables, functions that are too complex. You have to **fix these yourself**.

### Formatting Example (`gdformat`)

You write this messy code for a walking state:

```gdscript
var moveSpeed=200.0
func enter() -> void:
animationPlayer.play("walk")
func update(delta:float) -> void:
var velocity=inputComponent.get_direction()*moveSpeed
parent.velocity=velocity
parent.move_and_slide()
```

`gdformat` auto-fixes it to:

```gdscript
var moveSpeed = 200.0


func enter() -> void:
    animationPlayer.play("walk")


func update(delta: float) -> void:
    var velocity = inputComponent.get_direction() * moveSpeed
    parent.velocity = velocity
    parent.move_and_slide()
```

What changed:

| Fix | Before | After |
|-----|--------|-------|
| Spaces around `=` and `*` | `moveSpeed=200.0`, `direction()*moveSpeed` | `moveSpeed = 200.0`, `direction() * moveSpeed` |
| Blank lines between functions | None | Two blank lines added |
| Indentation | No indentation at all | Consistent tabs inside functions |
| Space after `:` in types | `delta:float` | `delta: float` |

You don't fix this yourself — `gdformat` handles it. If the formatter changes anything, the commit fails so you re-stage the clean version.

### Linting Examples (`gdlint`)

These examples show code that is **formatted correctly** but violates our project's `.gdlintrc` rules. Our project uses **camelCase** for variables and functions, **SCREAMING_SNAKE_CASE** for constants, and **PascalCase** for classes — not the GDScript defaults.

#### Example 1: Wrong naming conventions

```gdscript
const movement_speed = 200.0
signal health_decreased(current, maximum)


func MoveTowardPlayer():
    pass
```

`gdlint` flags:

```
game/scripts/player.gd:1: constant-name - Constant "movement_speed" does not match pattern "_?[A-Z][A-Z0-9]*(_[A-Z0-9]+)*"
game/scripts/player.gd:2: signal-name - Signal "health_decreased" does not match pattern "[a-z][a-z0-9]*([A-Z][a-z0-9]*)*"
game/scripts/player.gd:4: function-name - Function "MoveTowardPlayer" does not match pattern
```

| Error | What's wrong | Fix |
|-------|-------------|-----|
| `movement_speed` | Constants must be `SCREAMING_SNAKE_CASE` | `MOVEMENT_SPEED` |
| `health_decreased` | Signals must be `camelCase` | `healthDecreased` |
| `MoveTowardPlayer` | Functions must be `camelCase` (not PascalCase) | `moveTowardPlayer` |

#### Example 2: Non-descriptive names and unused code

```gdscript
var x = 100
var lastDirection = Vector2.ZERO


func update(delta: float) -> void:
    var tmp = x + delta
    print(tmp)
```

`gdlint` flags:

```
game/scripts/player.gd:1: variable-name - Variable "x" is not descriptive enough
game/scripts/player.gd:2: variable_name - Variable "lastDirection" is unused
game/scripts/player.gd:5: variable_name - Variable "tmp" is not descriptive enough
```

| Error | Why it matters |
|-------|---------------|
| `x` is not descriptive | Is it health? Speed? A counter? Nobody knows — rename to `maxHealth` or whatever it actually is |
| `lastDirection` is unused | Dead code clutters the file — remove it or use it |
| `tmp` is not descriptive | `tmp` could be anything — rename to `newHealth` or `elapsedTime` |

#### Example 3: Wrong class and enum naming

```gdscript
class_name walking_state
enum actionKey {UP, DOWN, LEFT, RIGHT}
```

`gdlint` flags:

```
game/scripts/walkingState.gd:1: class-name - Class "walking_state" does not match pattern "([A-Z][a-z0-9]*)+"
game/scripts/walkingState.gd:2: enum-name - Enum "actionKey" does not match pattern "([A-Z][a-z0-9]*)+"
```

| Error | What's wrong | Fix |
|-------|-------------|-----|
| `walking_state` | Class names must be `PascalCase` | `WalkingState` |
| `actionKey` | Enum names must be `PascalCase` | `ActionKey` |

### Why Both?

| Problem | Who catches it | Auto-fixed? |
|---------|---------------|-------------|
| Inconsistent indentation | `gdformat` | Yes |
| Missing spaces around operators | `gdformat` | Yes |
| Constant using `snake_case` not `SCREAMING_SNAKE` | `gdlint` | No — you rename it |
| Signal using `snake_case` not `camelCase` | `gdlint` | No — you rename it |
| Non-descriptive variable names | `gdlint` | No — you rename it |
| Unused variables | `gdlint` | No — you remove it |

Together they enforce two things: **everyone's code looks the same** (formatting) and **everyone's code follows our conventions** (linting). This makes reviewing PRs way faster since you focus on the logic, not style arguments.

## Daily Workflow

After setup, you don't need to do anything special. On every `git commit`:

1. The hook runs automatically on your staged `.gd` files
2. If formatting changes were needed, the commit fails — re-stage and commit again
3. If lint issues are found, the commit fails — fix the issues and try again

### Bypassing the Hook (Emergency Only)

```bash
git commit --no-verify
```

Use sparingly — this skips all checks. CI will still catch issues.

## Manual Usage

You can run the formatter and linter directly without committing:

```bash
# Format all .gd files in the game directory
gdformat game/

# Format a single file
gdformat game/scripts/shared/genericPlayer.gd

# Lint all .gd files
gdlint game/

# Lint a single file
gdlint game/scripts/shared/genericPlayer.gd
```

## Linter Configuration (`.gdlintrc`)

The project includes a `.gdlintrc` file in the repository root that customizes linting rules. This file is **automatically picked up** by `gdlint` — no extra setup needed.

### What it configures

| Setting | Value | Why |
|---------|-------|-----|
| **Naming convention** | camelCase + snake_case | The codebase uses `camelCase` for variables/functions (per AGENTS.md), but `gdlint` defaults to `snake_case` only. The config allows both. |
| **class-variable-name** | Also allows PascalCase + SCREAMING_SNAKE | For class references like `ComponentNames` and constants like `SEAT_TO_CLIENT` used as variables |
| **class-definitions-order** | Disabled | The project has a consistent but different layout from the GDScript default |
| **max-line-length** | 100 | Default threshold |

### Modifying rules

Edit `.gdlintrc` in the repo root. Run `gdlint --dump-default-config` to see all available options with their defaults.

```bash
# Dump default config for reference
gdlint --dump-default-config

# Test your changes
gdlint game/scripts/
```

> **Important:** The `.gdlintrc` is committed to the repo so all developers share the same lint rules. If you change it, commit it alongside the code changes it affects.

## Troubleshooting

### `pre-commit: command not found`

The virtual environment isn't activated. Run:

```bash
source .venv/bin/activate
```

If that fails, the venv may not exist yet — follow Step 1 to create it.

### `gdformat: command not found`

Same issue — the virtual environment isn't activated:

```bash
source .venv/bin/activate
```

If the venv exists but the tool is missing, reinstall:

```bash
uv pip install -r requirements-dev.txt
```

### Hook doesn't run on commit

You likely haven't run `pre-commit install` yet. Check if `.git/hooks/pre-commit` exists:

```bash
ls .git/hooks/pre-commit
```

If it's missing, run `pre-commit install`.

### Hook runs on wrong files

The hook is configured to only run on `.gd` files. Check `.pre-commit-config.yaml` — the `files: \.gd$` pattern controls this.

### Updating Tools

To get the latest versions:

```bash
source .venv/bin/activate
uv pip install --upgrade -r requirements-dev.txt
```

### Reinstalling from Scratch

```bash
rm -rf .venv
uv venv
source .venv/bin/activate
uv pip install -r requirements-dev.txt
pre-commit install
```

## Optional: Godot Editor Extensions

```gdscript
# TODO:
```

> [!NOTE]
> This section is a placeholder. Fill in setup instructions as needed.

* [ ] Set up GDScript formatter/linter integration in the Godot editor
* [ ] Configure external editor (e.g., VS Code, Neovim) with GDScript LSP
