# h1-title

Local Quartz plugin (transformer + component): the **article page** shows
its first root-level `#` heading as the single top-level title, while
**folder listings, breadcrumbs, explorer, search, graph and the tab title
keep the filename** (`frontmatter.title`, never mutated by us).

## Title ownership

| Field               | Set by                                                        | Consumed by                                                        |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `frontmatter.title` | note-properties (filename default) or explicit frontmatter    | folder listings, breadcrumbs, explorer, search, graph, tab title   |
| `fileData.h1Title`  | this plugin's transformer (first root-level `#` heading text) | this plugin's `ArticleTitle` component (the article page's `<h1>`) |

## Behavior

1. First root-level `#` heading text is stored as `fileData.h1Title` and
   the heading is removed from the body → exactly one `<h1>` per page,
   showing the heading text.
2. Files without a root-level H1 (e.g. `index.md`, virtual folder/tag
   pages) fall back to `frontmatter.title` — same as upstream
   `@quartz-community/article-title` (which this plugin replaces in
   `quartz.config.yaml`).
3. Explicit frontmatter title identical to the H1 → body copy dropped.
   Explicit title that differs → title wins; the H1 stays as section
   content (demoted to h2).
4. Any remaining root-level H1s are demoted to h2 so the outline has
   exactly one top level. (`#` comments inside fenced code blocks are code
   text — never touched.)

Transformer runs at `order: 6`, right after note-properties (order 5).
The `ArticleTitle` component takes upstream's layout slot
(`beforeBody`, priority 10).

Rebuild dist with `npm run build` inside this directory after editing
sources.
