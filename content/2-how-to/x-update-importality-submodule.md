# Update Importality Submodule

The Importality addon is tracked as a git submodule. This guide covers the submodule structure, how to fix missing submodules after cloning, and how to pull upstream updates.

## TOC

<!-- mtoc-start -->

* [Submodule Structure](#submodule-structure)
* [Verify / Repair the Setup](#verify--repair-the-setup)
* [Cloning Without Submodules](#cloning-without-submodules)
* [Updating Importality from Upstream](#updating-importality-from-upstream)
* [Atlas PNG Generation](#atlas-png-generation)
* [Why Fork + Submodule](#why-fork--submodule)

<!-- mtoc-end -->

## Submodule Structure

```
game/
├── _submodules/
│   └── godot-4-importality/             ← git submodule (full fork repo); .gdignore-guarded
│       ├── addons/
│       │   └── nklbdev.importality/     ← actual addon files (plugin.cfg, etc.)
│       ├── icon.png
│       └── ...
└── addons/
    └── nklbdev.importality → ../_submodules/.../addons/nklbdev.importality  ← symlink
```

> **Why the submodule lives outside `res://addons/`:** Godot discovers plugins by scanning `res://addons/*/plugin.cfg`. Because the submodule repo contains its own nested `addons/` tree, placing it under `res://addons/` caused Godot to discover Importality **twice** (once via the symlink, once via the nested real `plugin.cfg`). `.gdignore` only hides folders from the resource importer, not from plugin discovery — so the submodule is kept under `game/_submodules/` (outside the scan root) and only the symlink exposes it to Godot.

The submodule points to [Indie-Seishun/godot-4-importality](https://github.com/Indie-Seishun/godot-4-importality), which is a fork of the upstream [nklbdev/godot-4-importality](https://github.com/nklbdev/godot-4-importality).

A symlink bridges the submodule's nested directory structure to the path Godot expects (`game/addons/nklbdev.importality/plugin.cfg`).

## Verify / Repair the Setup

Run the helper script to sync submodules and verify the whole importality setup is healthy (it also heals common breakage):

```bash
# current worktree only
./scripts/dev-tools/update-submodules.sh

# every linked worktree in the workspace
./scripts/dev-tools/update-submodules.sh --all-worktrees
```

The script is idempotent and safe to re-run. It:

1. Runs `git submodule sync --recursive` + `git submodule update --init --recursive` — picks up `.gitmodules` path changes and checks out the pinned commits.
2. Verifies the `game/addons/nklbdev.importality` symlink resolves to a readable `plugin.cfg`. Recreates the symlink if it is missing, broken, or has been replaced by a regular file (e.g. Windows git corruption where the symlink is materialized as text).
3. Ensures `game/_submodules/.gdignore` exists (the guard that stops Godot importing the submodule's internal icons/READMEs as resources).
4. **Regression guard:** fails if a real `plugin.cfg` reappears nested under `game/addons/` — i.e. it catches the "Godot discovers Importality twice" bug coming back. Exit code is non-zero if any check fails, so it can be used in CI.

> **Note:** This script syncs/initializes the **locally pinned** submodule commits, then **interactively offers to bump** each submodule to its remote tip (`origin/HEAD` → fork `main`) — say `y` at the prompt to advance the checkout and stage the new pointer (stage-only; you commit the bump yourself). Skipped silently when stdin isn't a TTY. To pull **new changes from nklbdev's upstream** into the fork itself (a different operation that modifies the fork repo), use the manual flow in [Updating Importality from Upstream](#updating-importality-from-upstream) below.

## Cloning Without Submodules

If you cloned without `--recurse-submodules`, the symlink at `game/addons/nklbdev.importality` will point to an empty directory. The quickest fix is the helper script (see [Verify / Repair the Setup](#verify--repair-the-setup)):

```bash
./scripts/dev-tools/update-submodules.sh
```

Under the hood this runs:

```bash
git submodule update --init --recursive
```

…which clones the submodule and checks out the pinned commit, then verifies Godot can resolve the addon through the symlink. `./scripts/dev-tools/setup-workspace.sh` also handles submodule initialization automatically as part of a full workspace setup.

## Updating Importality from Upstream

When you want to pull the latest changes from nklbdev's upstream repo:

```bash
# Navigate into the submodule directory
cd game/_submodules/godot-4-importality

# Add upstream remote if not already set (only needed once per machine)
git remote add upstream https://github.com/nklbdev/godot-4-importality.git 2>/dev/null || true

# Pull and merge upstream changes
git fetch upstream
git merge upstream/main
git push origin main

# Return to project root and commit the updated submodule pointer
cd -
git add game/_submodules/godot-4-importality
git commit -m "chore: update importality to latest upstream"
```

> **Note:** The upstream remote is stored locally in `.git/modules/` — it persists on your machine but isn't shared with other team members. Each developer needs to add it once on their own machine.

## Atlas PNG Generation

Importality automatically generates a `.aseprite.png` sprite sheet file next to every `.aseprite` source file during import. This is a **custom patch in our fork** — upstream Importality does not do this.

### How It Works

When Godot imports a `.aseprite` file using **any Importality preset** (SpriteFrames, Sprite sheet, AnimatedSprite2D, etc.), the atlas image is saved as `<filename>.aseprite.png` in the same directory as the source file.

The PNG is registered as a generated file dependency — Godot will re-create it automatically when the source `.aseprite` changes or is reimported.

### Which Presets Generate the PNG

All Importality presets generate the PNG:

- Aseprite SpriteFrames
- Aseprite Sprite sheet (PortableCompressedTexture2D)
- Aseprite AnimatedSprite2D
- Aseprite AnimatedSprite3D
- Aseprite Sprite2D with AnimationPlayer
- Aseprite Sprite3D with AnimationPlayer
- Aseprite TextureRect with AnimationPlayer

> **Important:** If the file is imported using **Godot's built-in Texture2D importer** instead of Importality, the PNG will NOT be generated. Check the Import dock — if the importer name starts with "Aseprite" (e.g., "Aseprite SpriteFrames"), Importality is active. If it says just "Texture2D", the built-in importer is being used instead.

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| No `.png` generated | Using Godot's built-in Texture2D importer | Reimport with any Importality preset |
| No `.png` generated | Aseprite CLI not found | Install Aseprite and set path in Editor Settings → Importality |
| "Failed to save atlas PNG" in Output | File permission issue | Check write permissions on the directory |
| PNG exists but Godot can't find it | Missing `.import` file | Reimport the `.aseprite` file (right-click → Reimport) |
| "Export is failed" in Output | Aseprite export failed | Check Aseprite CLI path and file format |

### Checking Godot Output

If the PNG isn't appearing, check **Editor → Output** (or the Output panel at the bottom of the editor). Look for:

- `"Failed to save atlas PNG"` — the code ran but saving failed
- `"Failed to register atlas PNG dependency"` — saving worked but Godot couldn't track it
- `"Export is failed"` — Aseprite export failed entirely (check Aseprite CLI path)
- No warnings at all — the code isn't running (wrong import preset or Importality disabled)

## Why Fork + Submodule

| Approach | Pros | Cons |
|----------|------|------|
| **Fork + submodule** (chosen) | Control when to pull updates, patch bugs, survive upstream abandonment, PR upstream | One extra repo to maintain |
| Submodule (upstream directly) | Simpler setup | No control if upstream breaks or abandons |
| Vendored (files copy-pasted) | Simplest, just files | No version tracking, no update path |

Fork + submodule is the industry standard for game dev teams tracking third-party addons.
