# quartz-tsunderick-themes

Shared **Quartz v5 engine + design system** for all Tsunderick/Ashfall sites. This repo holds the UI: the Quartz core, house styles, custom plugins (theme switcher with 17 themes, folder sorting, graph labels, H1 titles, true-depth TOC), the explorer configuration, and the child-site build tooling (`scripts/`).

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
└── site-plugins/<name>/   # optional: extra plugins, overlaid onto plugins/
```

Everything else (Quartz core, plugins, themes, `package.json`, build tooling) comes from the engine at the pinned SHA — so compose logic can never drift from the engine version being composed.

## Composing and building

Run from the child site:

```bash
bash engine/scripts/build.sh             # compose + install + build → ./public
bash engine/scripts/build.sh --serve     # hot-reload dev server (port 8080)
```

What it does:

1. Extracts engine files into the site root (skipping the engine's own `content/`, `quartz.config.yaml`, `README.md`, `docs/`, CI, and `scripts/` — the child's own files always win).
2. Overlays child pieces: `static/` → `quartz/static/`, `site-plugins/` → `plugins/`, appends `styles/custom.scss`.
3. `npm ci` (cached by lockfile hash), `npx quartz plugin install`.
4. `npx quartz build` → emits `./public` at the site root (this is what gets deployed).

Cloudflare Workers build command for child sites:

```
git fetch --unshallow && git submodule update --init && bash engine/scripts/build.sh
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
printf 'v22.16.0\n' > .node-version
```

Add a `.gitignore` for everything the engine extracts (these are regenerated on every build, never tracked):

```gitignore
.DS_Store
node_modules
public
prof
tsconfig.tsbuildinfo
.obsidian
.quartz-cache
private/
.quartz/
.engine-deps-stamp
quartz/
plugins/
quartz.ts
quartz.config.default.yaml
package.json
package-lock.json
tsconfig.json
globals.d.ts
index.d.ts
.npmrc
.prettierignore
.prettierrc
```

Then write your site — `content/` (start with `index.md`), `quartz.config.yaml` (copy from an existing site and change `pageTitle`, `baseUrl`, fonts/colors/themes), and `static/icon.png` + `static/og-image.png` for branding. Preview with `bash engine/scripts/build.sh --serve`, then connect the repo to a new Cloudflare Workers build with the build command above.

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
