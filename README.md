# docs.ashfallsoftware.com

Internal documentation for Ashfall Software, built with [Quartz 5](https://quartz.jzhao.xyz/) and deployed to Cloudflare Pages at **https://docs.ashfallsoftware.com** behind Cloudflare Access (one-time PIN — teammates just need an email on the allow-list).

## Writing docs

All content is plain Markdown in `content/`. Folders become sections, pages link with Obsidian-style wikilinks, and callouts/mermaid/checklists are supported. The site itself has a "Contributing to the Docs" page with the full authoring guide.

```bash
# one-time setup (Node >= 22)
npm ci

# write in content/, preview at http://localhost:8080
npx quartz build --serve

# commit + push — Cloudflare Pages rebuilds automatically
npx quartz sync
```

## How it's deployed

- **Host**: Cloudflare Pages, connected to this repository. Production branch: `main`.
- **Build command**: `git fetch --unshallow && npx quartz plugin install && npx quartz build` (Pages shallow-clones by default; Quartz needs git history for page dates).
- **Build output**: `public/`
- **Access control**: a Cloudflare Zero Trust *self-hosted application* on `docs.ashfallsoftware.com` with a One-time PIN allow policy. Adjust the allow-list in the Zero Trust dashboard.

## Maintenance

- `npx quartz upgrade` — pull in upstream Quartz updates (upstream history is preserved in this repo's git).
- `quartz.config.yaml` — site title, theme, and plugin toggles (analytics is disabled; footer links; etc.).
- The upstream `.github/workflows/*` are guarded to only run on `jackyzha0/quartz`, so they skip silently here — leave them untouched to keep future upgrades conflict-free.
