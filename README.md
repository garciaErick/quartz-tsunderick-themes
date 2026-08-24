# quartz-tsunderick-themes

Shared **Quartz v5 engine + design system** for all Tsunderick/Ashfall sites. This repo holds the UI: the Quartz core, house styles, custom plugins (theme switcher with 17 themes, font switcher with self-hosted Operator Mono + JetBrains Mono, folder sorting, graph labels, H1 titles, true-depth TOC), the explorer configuration, the child-site build tooling (`scripts/`), and starter templates for new sites (`templates/`).

Individual websites ("child sites") live in their own repos and contain **only content + configuration** — no build logic. They pull this engine in as a git submodule pinned to an exact commit.

Based on [jackyzha0/quartz](https://github.com/jackyzha0/quartz) (upstream remote is configured — see [Updating from upstream Quartz](#updating-from-upstream-quartz)).

## Child-site contract

A child site repo contains **only site-specific files**:

```
my-site/
├── content/               # markdown (required)
├── quartz.config.yaml     # identity (pageTitle, baseUrl, colors, fonts) + overrides on top of the engine default (required)
├── engine/                # git submodule → this repo, pinned SHA (required)
├── static/                # optional: icon.png, og-image.png → overlaid onto quartz/static/
├── styles/custom.scss     # optional: APPENDED after the engine's house styles
├── site-plugins/<name>/   # optional: extra plugins, overlaid onto plugins/
└── .site-subpath          # optional: serve under a subpath, e.g. "docs" (see below)
```

Everything else (Quartz core, plugins, themes, `package.json`, build tooling) comes from the engine at the pinned SHA — so compose logic can never drift from the engine version being composed.

## The golden rule: fix it in the engine

The entire point of this architecture: **make a change here, and every site gets it on its next engine bump.** Child repos carry only content + identity (`pageTitle`, `baseUrl`, theme, and toggles that genuinely differ). If you ever find yourself editing the same thing in more than one child config, that change belongs in the engine — that's the maintenance model.

### Config layering

The child's `quartz.config.yaml` **overlays** the engine's `quartz.config.default.yaml` (which `build.sh` extracts into every child site on each build). The merge is **replace-per-plugin**, implemented in `quartz/plugins/loader/merge-config.ts`:

| Thing                                    | Rule                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Plugin entry with the same source        | child entry replaces the engine's wholesale (`enabled`, `order`, `options`, `layout`) |
| Engine default the child doesn't mention | inherited as-is — this is how engine-wide fixes ship                                  |
| Child-only entry                         | appended                                                                              |
| Opt out of an inherited default          | list it in the child config with `enabled: false`                                     |
| `configuration`                          | shallow merge, child wins per key                                                     |
| `layout.groups`                          | merged per group **and per field** — tweak one knob, inherit the rest                 |
| `layout.byPageType`                      | merged per page type; `positions` per position; `exclude` child wins                  |

`./plugins/foo` and `plugins/foo` count as the same source. The CLI (`npx quartz plugin add/remove/list`) still reads and writes the **raw** child file — inherited entries are only visible in the effective config the build loads (and in `npx quartz plugin install`, which uses the layered read so inherited external plugins get installed).

Current engine-enforced defaults beyond upstream Quartz: `toc-true-depth` (order 51 — true heading levels in the TOC, pairs with the H-prefix styles in house `custom.scss`), `folder-alpha`, `h1-title`, `theme-switcher`, `font-switcher`, `graph-labels`.

**Right-sidebar canonical order** (engine-enforced): TOC (priority 30) → backlinks (50) → graph (60, bottom). The graph is the house `./plugins/graph-labels` wrapper (always-visible node labels); upstream `@quartz-community/graph` stays listed-but-disabled as the visible opt-anchor. Opt out per site: disable the wrapper entry (and re-enable upstream) in the child config, or give either a different `priority` to reposition it.

**H1 in the TOC:** style guides allow exactly one top-level H1 per page, and `h1-title` splices it out of the body as the article title before the TOC transformer runs — so `toc-true-depth` prepends it back as a synthetic first entry (`H1 <title>`, linking to the shared `#article-title` anchor that `h1-title`'s ArticleTitle renders; the TOC scroll-spy highlights it at the page top). Pages with no other TOC entries keep their no-TOC rendering. Opt out per site with `includeH1: false` on the `./plugins/toc-true-depth` entry.

**Per-site identity** (child-owned, never engine): `pageTitle`/`baseUrl`, fonts/colors, `static/icon.png` + `static/og-image.png` branding.

### Shipping an engine-wide change

1. Implement it here (plugin, house style, or a new `quartz.config.default.yaml` entry), add tests, `npm test && npm run check`.
2. Commit + push **this** repo — children can only fetch engine commits that exist on `main`.
3. In each child: `bash engine/scripts/update-engine.sh`, review, push the child. That push **is** the deploy.

Rollback stays trivial: the child's bump is a normal commit (`git revert HEAD`), so a bad engine change unwinds per-site without touching the others.

## Composing and building

### First-time setup (fresh clone)

A fresh clone has an empty `engine/` — submodules store a pointer, not files:

```bash
git submodule update --init    # clones the engine at the pinned commit
```

Builds run on the node version pinned by the child's `.node-version`. With mise:

```bash
mise exec node@22.16.0 -- bash engine/scripts/build.sh --serve
```

`build.sh` warns (but does not fail) when the running node major differs from the pin.

Run from the child site:

```bash
bash engine/scripts/build.sh             # compose + install + build → ./public
bash engine/scripts/build.sh --serve     # hot-reload dev server (port 8080)
```

What it does:

1. Extracts engine files into the site root (skipping the engine's own `content/`, `quartz.config.yaml`, `README.md`, `docs/`, CI, `scripts/`, and `templates/` — the child's own files always win).
2. Overlays child pieces: `static/` → `quartz/static/`, `site-plugins/` → `plugins/`, appends `styles/custom.scss`.
3. `npm ci` (cached by lockfile hash), `npx quartz plugin install`.
4. `npx quartz build` → emits `./public` at the site root (this is what gets deployed).
5. Copies `quartz/static/` assets into the output (Quartz's Static emitter uses a gitignore-aware glob, which can't see the engine-extracted `quartz/` in child sites) and, for subpath sites, mirrors the 404 page to the output root.

Cloudflare Workers build command for child sites:

```
git fetch --unshallow && git submodule update --init && bash engine/scripts/build.sh
```

### Serving under a subpath (e.g. `domain.com/docs`)

Add a `.site-subpath` file to the child root containing a single path segment (e.g. `docs`), and set the config's `baseUrl` to the full `domain.com/docs`. Quartz v5 derives the page basePath from the baseUrl's path, so links, the SPA router, and the 404 page all honor the prefix. After building, `build.sh` restructures the output so the deployable manifest literally contains `docs/index.html` etc.:

```
public/
└── docs/
    ├── index.html
    └── ...
```

Notes:

- The Cloudflare build command is unchanged — subpath sites are configured by the file, not the command.
- Local `--serve` deliberately previews at `http://localhost:8080/` **without** the prefix (Quartz renders an empty basePath in serve mode).
- Disable the `cname` emitter in a subpath site's config (a CNAME file only makes sense for a root domain).
- `update-engine.sh` works unchanged from a subdirectory of a monorepo — the child site _is_ its directory.

### Cloudflare Workers deployment (wrangler config)

Workers created through the dashboard with an assets directory get their deploy config injected by Cloudflare. If your worker was created without one (or deploy fails with _"Could not detect a directory containing static files"_), commit a minimal `wrangler.jsonc` in the child root — see `templates/wrangler.jsonc`:

```jsonc
{
  "name": "your-worker-name",
  "compatibility_date": "2026-08-21",
  "assets": {
    "directory": "./public",
    "not_found_handling": "404-page",
  },
}
```

## Updating a site's engine (manual bump)

Run from the child site:

```bash
bash engine/scripts/update-engine.sh     # fetches latest engine main, shows incoming commits, commits the bump
# review with: git show HEAD --submodule=log   — then push to deploy
```

The pinned SHA lives in the child's git tree, so every deployment is reproducible and bumps are reviewable commits (`git revert HEAD` rolls one back).

### Testing engine changes against a real site (without committing)

```bash
cd my-site/engine
git checkout my-wip-branch          # any local branch or detached experiment
cd ..
bash engine/scripts/build.sh --serve   # serves the site with your WIP engine
# happy? commit+push in engine/, then bash engine/scripts/update-engine.sh
```

## Creating a new site

```bash
git clone git@github.com:YOU/my-site.git && cd my-site
git submodule add -b main https://github.com/garciaErick/quartz-tsunderick-themes.git engine
cp engine/templates/gitignore .gitignore
cp engine/templates/quartz.config.yaml quartz.config.yaml
printf 'v22.16.0\n' > .node-version
```

Then make it yours:

- `content/` — write markdown, starting with `index.md`
- `quartz.config.yaml` — edit the marked **identity block** (`pageTitle`, `baseUrl`, fonts, colors); trim the theme-switcher menu if you want fewer than 17 themes
- `static/icon.png` + `static/og-image.png` — branding

Preview with `bash engine/scripts/build.sh --serve`, commit, and connect the repo to a new Cloudflare Workers build with the build command above.

Starter files live in `templates/` (`quartz.config.yaml`, `gitignore`) and are versioned with the engine — so new sites always start from the current house defaults.

## Updating from upstream Quartz

This repo keeps the full Quartz history and its merge-base, so upstream updates are plain merges:

```bash
git fetch upstream
git merge upstream/v5
# resolve conflicts (quartz/ core is unmodified, so this is usually clean)
npm ci && npx quartz plugin install && npm test && npm run check
git push
```

Then run `bash engine/scripts/update-engine.sh` in each child site to pick it up.

## Engine-only development

The engine has its own placeholder page (`content/index.md`, a theme preview). `npx quartz build --serve` here serves it — handy for trying out new themes and fonts before any site consumes them. (The compose scripts intentionally refuse to run outside a child site.)

## Troubleshooting

### `sharp: Attempting to build from source via node-gyp` / `Please add node-gyp to your dependencies`

sharp ships prebuilt binaries (the `@img/sharp-*` optional deps) and never needs to compile on stock systems. On machines with a **system-wide libvips** (check: `pkg-config --modversion vips-cpp` — e.g. Arch's `libvips` package), sharp's install script detects it, rejects the prebuilt, and insists on compiling against the global copy — which fails without a node-gyp toolchain. Worse, the `npm ci` failure rollback scrubs `node_modules`, which looks like packages "vanishing".

Since engine commit `99e484b`, `build.sh` exports `SHARP_IGNORE_GLOBAL_LIBVIPS=1` to force the bundled prebuilt, so current pins are immune. Workaround on an older pin:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 bash engine/scripts/build.sh
```

### Native dep install failures under a different node than `.node-version`

Symptoms are misleading — sharp demanding a source build, esbuild binary mismatches, odd ABI errors. Run the pinned version instead (build.sh warns on major mismatch):

```bash
mise exec node@$(cat .node-version) -- bash engine/scripts/build.sh
```

### `ERESOLVE could not resolve` (`rehype-typst` peer conflict) — latent

The engine pins `@myriaddreamin/rehype-typst@^0.6.0`, while `@quartz-community/latex@0.1.0` declares `rehype-typst@^0.5.0` as an optional peer. The engine's `.npmrc` (extracted into every child site) sets `legacy-peer-deps=true`, which suppresses the conflict during `npm ci`. Harmless today — but if you remove that flag or bump either package, expect `npm ci` to refuse until the versions re-align.
