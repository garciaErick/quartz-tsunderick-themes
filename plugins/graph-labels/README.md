# graph-labels

Graph view with **always-visible node names** — a thin wrapper around
[`@quartz-community/graph`](https://www.npmjs.com/package/@quartz-community/graph)
(not a fork).

## Why

Upstream `@quartz-community/graph@0.1.0` creates every node label with
`alpha = 0` and only reveals labels:

- on hover, or
- via a zoom-driven fade (`max((zoom × opacityScale − 1) / 3.75, 0)`), which
  reaches full opacity around **4.75× zoom** — effectively invisible at
  normal zoom levels.

There is no configuration option for label visibility (only `fontSize`), so
this wrapper patches the component's minified inline render script at
instantiation time. Same data source, layout engine, options, and rendering
otherwise.

## What it patches

Two exact-string anchors in `Graph().afterDOMLoaded` (each must match exactly
once, otherwise the patch is skipped with a console warning):

| Anchor (minified)                   | Replacement | Effect                        |
| ----------------------------------- | ----------- | ----------------------------- |
| `lu.anchor.set(.5,1.2),lu.alpha=0,` | `…alpha=1,` | labels start visible          |
| `Math.max((l-1)/3.75,0)`            | `1`         | zooming never re-hides labels |

Both the right-sidebar local graph and the fullscreen global graph share the
same script, so both get visible labels.

## Maintenance

If `@quartz-community/graph` is upgraded:

1. Re-check the anchors against the new minified script (see `PATCHES` in
   `index.ts`). Extract the current script with:
   ```bash
   node --input-type=module -e "
     import { Graph } from '@quartz-community/graph'
     import fs from 'fs'
     fs.writeFileSync('/tmp/graph.inline.js', Graph({}).afterDOMLoaded)
   "
   ```
2. Update `PATCHES` if the minified variable names changed.
3. Rebuild: `npm run build` inside this directory (or
   `node plugins/graph-labels/build.mjs` from the repo root). `dist/` is
   committed — Quartz loads local plugins as plain JS.

A failed anchor never crashes the build; the graph simply falls back to
stock behavior for that aspect and logs a `[graph-labels]` warning.

## Usage

`quartz.config.yaml` (this replaces the `@quartz-community/graph` entry —
keep that one disabled, like `folder-page` vs `folder-alpha`):

```yaml
plugins:
  - source: "@quartz-community/graph"
    enabled: false
  - source: "./plugins/graph-labels"
    enabled: true
    layout:
      position: right
      priority: 10
```

All upstream `GraphOptions` (`localGraph` / `globalGraph` D3 config) pass
through unchanged.
