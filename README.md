# quartz-tsunderick-themes

The **forkable base** for every Tsunderick/Ashfall site: the Quartz v5 core, the house design system (theme switcher with 17 themes, font switcher with self-hosted Operator Mono + JetBrains Mono), and the house plugins (`toc-true-depth`, `folder-alpha`, `h1-title`, `graph-labels`, `backlinks-collapse`, `reader-zen`).

Each site is a **self-contained fork of this repo**: it carries its own content + identity, builds with plain npm, and pulls house improvements by merging from `base`. This repo is the product — sites fork _this_ code, not upstream.

Based on [jackyzha0/quartz](https://github.com/jackyzha0/quartz); the upstream remote is configured and upstream merges remain possible but non-driving (see the appendix).

## The model in one minute

```
 you ──▶ quartz-tsunderick-themes (base: themes, plugins, quartz core)
              │
              │   git fetch base && git merge base/main     (or: quartz-sync sync)
              ├──▶ 7th-heaven.tsunderick.space ── push ──▶ Cloudflare deploy
              └──▶ docs.ashfallsoftware.com   ── push ──▶ Cloudflare deploy
```

- **Forks own everything they show**: `content/`, `quartz.config.yaml` identity (pageTitle, baseUrl, colors, fonts, plugin toggles), `README.md`, homepage, `quartz/static/` branding.
- **The base owns what every site should inherit**: quartz core, house plugins, house styles, `package.json`, CI, `.gitattributes` sync policies.
- **Push = deploy**: a fork's push to `main` triggers its Cloudflare build.

## The invariant: sync ≠ build

Rust exists only on the **sync** path (`tools/quartz-sync`). Building a site never needs it:

```
npm ci && npx quartz plugin install && npx quartz build
```

must work on a machine with zero Rust installed. Cloudflare CI never invokes cargo. A fork that never syncs never compiles anything.

## Syncing base improvements into a site

### The easy way — `quartz-sync`

```
cd tools/quartz-sync && cargo build --release     # once, on your dev machine
../..                                            # repo root
tools/quartz-sync/target/release/quartz-sync setup   # once: registers merge drivers (idempotent)
tools/quartz-sync/target/release/quartz-sync sync    # fetch base + merge + resolve + commit
```

`sync` (default ref `base/main`):

1. fetches `base` and merges `--no-commit --no-ff`,
2. resolves a conflicted `quartz.config.yaml` **semantically** — per-key 3-way: your intentional changes win, base's changes flow where you didn't touch, both-changed → yours + a warning naming the path,
3. **fork-identity guard**: keeps your `README.md` and `content/index.md` even when base alone changed them (`merge=ours` attributes only fire on conflicts — one-sided changes would otherwise flow in silently),
4. runs `npm install` to reconcile the lockfile when `package.json` changed (set `QUARTZ_SYNC_SKIP_NPM=1` to skip),
5. auto-commits clean syncs as `sync: base <old>..<new>`; anything it can't resolve exits nonzero with guidance (git's conflict markers are left in place; `git merge --abort` rolls back).

### The manual way (no tooling required)

```bash
git fetch base
git merge base/main --no-commit
# resolve quartz.config.yaml by hand if base touched it
git restore --source=HEAD --staged --worktree -- README.md content/index.md   # only if base changed them
npm install                      # if package.json changed
git commit
```

### What auto-resolves vs. what's manual

| Path | Behavior |
| --- | --- |
| `quartz.config.yaml` | semantic 3-way (driver `quartz-config`, registered by `setup`) |
| `README.md`, `content/index.md` | always yours (`merge=ours` driver + sync guard) |
| `package-lock.json`, `.node-version` | ours on conflict; base's one-sided bumps flow in (desired) |
| `quartz/styles/custom.scss` | git-native merge — same-region edits on both sides are the one known manual case |
| everything else | normal git merge |

**Absence is deletion.** Fork configs are full-ownership documents: a key missing from your config is an intentional removal, not "inherit from base" (that was the old engine's layering, now retired). To keep a key, leave it in the file.

## The golden rule: fix it in the base

If you find yourself editing the same thing in more than one fork, it belongs here. Ship it in the base, then one `sync` per site. Forks stay tiny: content + identity.

## Creating a new site

```bash
git clone https://github.com/garciaErick/quartz-tsunderick-themes.git my-site && cd my-site
git remote rename origin base                      # the sync source
git remote add origin git@github.com:YOU/my-site.git
```

Then make it yours:

- `content/` — markdown, starting with `index.md`
- `quartz.config.yaml` — edit the **identity**: `pageTitle`, `baseUrl`, `locale`, `theme.typography`, `theme.colors`, the theme-switcher `themes` menu; branding → `quartz/static/icon.png` + `og-image.png`
- `README.md`, `content/index.md` — yours from the start

Build locally:

```bash
mise exec node@$(cat .node-version) -- npx quartz build --serve   # http://localhost:8080
```

Deploy: connect the repo to a Cloudflare Workers build with

```
git fetch --unshallow && npm ci && npx quartz plugin install && npx quartz build
```

and, if the Worker wasn't created through the dashboard with an assets directory, commit a fork-owned `wrangler.jsonc`:

```jsonc
{
  "name": "your-worker-name",
  "compatibility_date": "2026-08-21",
  "assets": {
    "directory": "./public",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  }
}
```

## House plugins & styles (what forks inherit)

Engine-enforced defaults beyond upstream Quartz: `toc-true-depth` (order 51 — true heading levels in the TOC, pairs with the H-prefix styles in house `custom.scss`), `folder-alpha`, `h1-title`, `theme-switcher`, `font-switcher`, `graph-labels`, `backlinks-collapse` (backlinks with a fold-away header, mirroring the TOC), `reader-zen` (reader mode with persistent _italic_ / _full-width_ zen sub-options while reading).

**Right-sidebar canonical order** (house-enforced): TOC (priority 30) → backlinks (50) → graph (60, bottom). The graph is the house `./plugins/graph-labels` wrapper (always-visible node labels); upstream `@quartz-community/graph` stays listed-but-disabled as the visible opt-anchor. Opt out per site: disable the wrapper entry (and re-enable upstream), or change a `priority`.

**Cascade-layering hazard (house styles vs plugin CSS):** the emitted stylesheet is `@layer quartz-base { …core + plugin CSS… }` followed by `custom.scss` **unlayered** — and unlayered declarations beat layered ones _regardless of specificity_. A house rule like `.sidebar .toc { flex: 0 0 auto }` will silently kill a plugin's layered interactive-state rule (`.toc:has(button.toc-header.collapsed) { flex: 0 1 1.4rem }` — this exact bug shipped once). Any style that must coexist with an interactive plugin state (`.collapsed`, `[reader-mode=on]`, …) needs an explicit stand-down guard or high-specificity state-scoped selectors — see the guards throughout `quartz/styles/custom.scss`.

**H1 in the TOC:** `h1-title` splices the page's single H1 out of the body as the article title before the TOC transformer runs — so `toc-true-depth` prepends it back as a synthetic first entry (`H1 <title>`, linking to the shared `#article-title` anchor). Pages with no other TOC entries keep their no-TOC rendering. Opt out with `includeH1: false` on the `./plugins/toc-true-depth` entry.

**Serving under a subpath:** Quartz v5 derives the page basePath from the config `baseUrl` path (`domain.com/docs`), so links/SPA/404 honor the prefix natively. The engine-era output re-structuring (`public/<subpath>/index.html`) retired with `build.sh` — if a deploy target literally needs that layout, post-process the build.

## The sync toolkit (`tools/quartz-sync`)

Single Rust crate, deliberately tiny (`serde_yaml_ng` only, isolated behind `src/yaml_io.rs` so the YAML crate is a one-file swap):

```
src/merge.rs    pure semantic 3-way core (no I/O; 20 unit tests, incl. the
                four migration fixtures: base-adds-plugin · base-fixes-
                options+fork-identity · fork-disables-inherited · both-touch-
                theme-switcher)
src/yaml_io.rs  parse/emit boundary + leading-comment (schema directive) capture
src/driver.rs   git merge-driver entrypoint (`driver %O %A %B %P`)
src/sync.rs     fetch/merge/resolve/guard/lockfile/auto-commit orchestration
src/setup.rs    idempotent driver registration (quartz-config + ours — note:
                git ships NO built-in "ours" driver; `setup` defines it)
```

`setup` also registers the conventional `ours` merge driver (`merge.ours.driver = true`) — without it the `.gitattributes` ours-policies are inert for plain `git merge`.

## Upstream Quartz merges (appendix — possible, not driving)

This repo keeps the full Quartz history, so upstream updates are plain merges:

```bash
git fetch upstream
git merge upstream/v5
# resolve conflicts (quartz/ core is pristine, so this is usually clean)
npm ci && npx quartz plugin install && npm test && npm run check
git push            # forks receive it via their next sync
```

## Base-only development

The base self-hosts a theme preview (`content/index.md`): `npx quartz build --serve` here. `npm test && npm run check` gate the core; `cd tools/quartz-sync && cargo fmt --check && cargo clippy --all-targets -- --deny warnings && cargo test` gates the toolkit.

## Troubleshooting

### `sharp: Attempting to build from source via node-gyp`

sharp ships prebuilt binaries (the `@img/sharp-*` optional deps). On machines with a **system-wide libvips** (`pkg-config --modversion vips-cpp`, e.g. Arch), sharp's install script detects it, rejects the prebuilt, and insists on compiling — which fails without node-gyp. Workaround:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci
```

(`npm ci --ignore-scripts && npm rebuild` also works — the module itself is fine; only its check script misfires.)

### Native dep failures under the wrong node

Run the pinned version: `mise exec node@$(cat .node-version) -- npm ci`.

### `ERESOLVE could not resolve` (`rehype-typst` peer conflict) — latent

This repo pins `@myriaddreamin/rehype-typst@^0.6.0`; `@quartz-community/latex@0.1.0` declares `rehype-typst@^0.5.0` as an optional peer. `.npmrc` sets `legacy-peer-deps=true`, suppressing the conflict. Harmless today — removing the flag or bumping either package will resurface it until versions re-align.
