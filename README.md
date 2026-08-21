# quartz-tsunderick-themes

Shared **Quartz v5 engine + design system** for all Tsunderick/Ashfall sites. This repo holds the UI: the Quartz core, house styles, custom plugins (theme switcher with 17 themes, folder sorting, graph labels, H1 titles, true-depth TOC), and the explorer configuration.

Individual websites ("child sites") live in their own repos and contain **only content + configuration**. They pull this engine in as a git submodule and compose it at build time.

Based on [jackyzha0/quartz](https://github.com/jackyzha0/quartz) (upstream remote is configured — see [Updating from upstream Quartz](#updating-from-upstream-quartz)).

## Child-site contract

A child site repo looks like this:

```
my-site/
├── content/               # markdown (required)
├── quartz.config.yaml     # pageTitle, baseUrl, colors, fonts, plugin toggles (required)
├── engine/                # git submodule → this repo, pinned SHA (required)
├── static/                # optional: icon.png, og-image.png → overlaid onto quartz/static/
├── styles/custom.scss     # optional: APPENDED after the engine's house styles
├── site-plugins/<name>/   # optional: extra plugins, overlaid onto plugins/
├── scripts/build.sh       # compose + build script (copy from an existing site)
└── scripts/update-engine.sh
```

The engine itself (this repo) is **never edited from a child site** — changes here propagate to every site on their next engine bump.

## Composing and building

`scripts/build.sh` in a child site does the following:

1. Copies engine files into the site root (skipping the engine's own `content/`, `quartz.config.yaml`, `README.md`, `docs/`, CI, and similar engine-only files — the child's own versions always win).
2. Overlays child pieces: `static/` → `quartz/static/`, `site-plugins/` → `plugins/`, appends `styles/custom.scss`.
3. `npm ci` (or `npm install` if `node_modules` is warm), `npx quartz plugin install`, `npx quartz build`.
4. Emits `./public` at the site root (this is what gets deployed).

Local dev: `bash scripts/build.sh --serve` (hot-reload server on port 8080).

## Updating a site's engine (manual bump)

```bash
./scripts/update-engine.sh          # fetches latest engine main, commits the bump
# review the submodule diff, then push to deploy
```

or by hand:

```bash
git submodule update --remote engine
git diff --submodule=log            # see what you're getting
git add engine && git commit -m "bump engine" && git push
```

The pinned SHA lives in the child's git tree, so every deployment is reproducible and bumps are reviewable commits.

### Testing engine changes against a real site (without committing)

```bash
cd my-site/engine
git checkout my-wip-branch          # any local branch or detached experiment
cd ..
bash scripts/build.sh --serve       # serves the site with your WIP engine
# happy? commit in engine/, push, then bump the child's submodule
```

## Creating a new site

1. Create a new repo, copy `scripts/`, `.gitignore`, `.node-version`, and `LICENSE.txt` from an existing child site (e.g. `Ashfall-Software/docs.ashfallsoftware.com`).
2. Add the engine: `git submodule add -b main https://github.com/garciaErick/quartz-tsunderick-themes.git engine`
3. Write `content/` and `quartz.config.yaml` (baseUrl = your domain; fonts/colors/themes to taste).
4. Add `static/icon.png` + `static/og-image.png` for branding.
5. Point your Cloudflare Workers build at the repo with build command:
   `git fetch --unshallow && git submodule update --init && bash scripts/build.sh`

## Updating from upstream Quartz

This repo keeps the full Quartz history and its merge-base, so upstream updates are plain merges:

```bash
git fetch upstream
git merge upstream/v5
# resolve conflicts (quartz/ core is unmodified, so this is usually clean)
npm ci && npx quartz plugin install && npm test && npm run check
git push
```

Then bump each child site to pick it up.

## Engine-only development

The engine has its own placeholder page (`content/index.md`, a theme preview). `npx quartz build --serve` here serves it — handy for trying out new themes and fonts before any site consumes them.
