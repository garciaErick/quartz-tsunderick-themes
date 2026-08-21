# quartz-tsunderick-themes

Shared **Quartz v5 engine + design system** for all Tsunderick/Ashfall sites. This repo holds the UI: the Quartz core, house styles, custom plugins (theme switcher with 17 themes, folder sorting, graph labels, H1 titles, true-depth TOC), the explorer configuration, the child-site build tooling (`scripts/`), and starter templates for new sites (`templates/`).

Individual websites ("child sites") live in their own repos and contain **only content + configuration** — no build logic. They pull this engine in as a git submodule pinned to an exact commit.

Based on [jackyzha0/quartz](https://github.com/jackyzha0/quartz) (upstream remote is configured — see [Updating from upstream Quartz](#updating-from-upstream-quartz)).

## Child-site contract

A child site repo contains **only site-specific files**:

```
my-site/
├── content/               # markdown (required)
├── quartz.config.yaml     # pageTitle, baseUrl, colors, fonts, plugin toggles (required)
├── engine/                # git submodule → this repo, pinned SHA (required)
├── static/                # optional: icon.png, og-image.png → overlaid onto quartz/static/
├── styles/custom.scss     # optional: APPENDED after the engine's house styles
├── site-plugins/<name>/   # optional: extra plugins, overlaid onto plugins/
└── .site-subpath          # optional: serve under a subpath, e.g. "docs" (see below)
```

Everything else (Quartz core, plugins, themes, `package.json`, build tooling) comes from the engine at the pinned SHA — so compose logic can never drift from the engine version being composed.

## Composing and building

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
