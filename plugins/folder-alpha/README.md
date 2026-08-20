# folder-alpha

Local Quartz pageType plugin: folder index pages with **alphabetical
ordering by filename**, wrapping `@quartz-community/folder-page` (no fork —
same rendering, options, virtual-page generation; only the sort changes).

## Ordering

1. Subfolders first (Quartz convention)
2. Then files — each group sorted A→Z by **filename (slug)**, so numeric
   prefixes (`1-`, `2-`, `x-`) keep controlling the order regardless of
   edit dates (the upstream default sorts by last-modified, which
   scrambles order on every edit)
3. Tiebreak on displayed title

Display titles come from `frontmatter.title` — with `plugins/h1-title`
enabled, listings show the author's first `#` heading text while the
filename keeps controlling order. Dates still render on entries.

## Config

Disable `@quartz-community/folder-page` and enable `./plugins/folder-alpha`
with the same options (`showFolderCount`, `showSubfolders`). Tag pages are
not affected (upstream tag-page keeps its own sort).

Rebuild dist with `npm run build` inside this directory after editing
`index.ts`.
