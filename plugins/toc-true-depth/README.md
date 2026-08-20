# toc-true-depth

Table of contents entries carry their **true heading levels** instead of
[`@quartz-community/table-of-contents`](https://www.npmjs.com/package/@quartz-community/table-of-contents)'
level-relative depths.

## Why

Upstream normalizes every toc entry with `depth = headingLevel −
shallowestLevel`. When all of a page's sections sit at the same level (the
common case here, since `plugins/h1-title` promotes the first H1 to the page
title and demotes the rest to H2), every entry becomes `depth-0` — a flat
wall with no hierarchy signal.

This transformer runs at `order: 51`, immediately after the TOC transformer
(`order: 50`), re-walks the heading tree, and overwrites
`file.data.toc[].depth` with the real heading levels. The component then
emits `depth-2` / `depth-3` classes that `quartz/styles/custom.scss` styles
with `H2` / `H3` prefixes and level-keyed indentation.

## Safety

- Only runs when `file.data.toc` exists (TOC transformer enabled & page had
  enough entries).
- If the heading walk and the toc array disagree on count (upstream changed
  its filtering?), the plugin leaves the normalized depths untouched —
  fallback to stock behavior, never a crash.

## Configuration

```yaml title="quartz.config.yaml"
plugins:
  - source: "@quartz-community/table-of-contents"
    enabled: true
    order: 50
  - source: "./plugins/toc-true-depth"
    enabled: true
    order: 51
```

If you ever set the TOC transformer's `maxDepth` option, pass the same value
here (default `3`) so the two walks stay in sync.

## Maintenance

Rebuild after edits: `npm run build` in this directory (or
`node plugins/toc-true-depth/build.mjs` from the repo root). `dist/` is
committed — Quartz loads local plugins as plain JS.
