# font-switcher

A local Quartz v5 plugin that adds a **runtime font dropdown** to the left
toolbar. Visitors can switch the entire site's typeface between the
self-hosted fonts in the catalog, with the choice persisted in
`localStorage`.

## How it works

```
build time   ./plugins/font-switcher (emitter)
              ├── font catalog → static/font-faces.css (@font-face for every
              │   configured font) + woff2 files copied to static/fonts/
              ├── bakedFont option → static/font-default.css, guard-scoped
              │   under html:not([data-font-selected]), injected per-page
              │   via <link data-baked-font>
              ├── per-font override css → static/font-<id>.css
              └── font manifest data → FontSwitcher component (SSR menu)

runtime      selecting a font sets html[data-font-selected] (early script,
             pre-paint) which fully neutralizes the guarded baked css and
             disables its <link>; the chosen font css loads alone on top.
```

- The override css sets the Obsidian cascade override slots
  (`--font-text-override`, `--font-interface-override`,
  `--font-monospace-override`, `--font-print-override`) plus the Quartz
  typography vars (`--titleFont`/`--headerFont`/`--bodyFont`/`--codeFont`)
  and re-asserts `h1`–`h6` — so the selected font applies site-wide under
  every quartz-themes theme, and beats quartz-fonts' layered rules.
- Each font carries a small readability knob (`articleLineHeight`):
  monospace at paragraph length reads better with a touch more leading,
  scoped to `article` content so sidebars and menus keep their rhythm.
- `@font-face` rules are inert until a family renders, so declaring every
  font costs nothing; browsers only fetch the files in use. Note the baked
  font's woff2 **does** download on every cold load (~1MB per weight for
  Operator Mono) even when another font is stored — static HTML can't know
  the visitor's choice server-side.
- `?font=<id>` on any URL previews a font **without persisting it**.
- Every option label renders in its own typeface as a live preview.

## Configuration

```yaml
- source: "./plugins/font-switcher"
  enabled: true
  order: 61
  options:
    bakedFont: operator-mono # site default (also used with JS off)
    fonts:
      - id: default # the baked font
        label: Operator Mono
      - id: jetbrains-mono
        label: JetBrains Mono
  layout:
    position: left
    priority: 33
    group: toolbar
```

Without `bakedFont`, the `default` entry means "the theme's own fonts"
(three-option semantics), matching how theme-switcher's default works.

## Font catalog

| id               | family         | files                                           |
| ---------------- | -------------- | ----------------------------------------------- |
| `operator-mono`  | Operator Mono  | 10 static woff2 (200/300/400/500/700 + italics) |
| `jetbrains-mono` | JetBrains Mono | 2 variable woff2 (wght 100–800, roman + italic) |

Operator Mono (commercial, Hoefler&Co) woff2 live in `assets/fonts/` and
are committed to this repo deliberately — the same files already ship in
the public [ashfallsoftware.com](https://github.com/Ashfall-Software/ashfallsoftware.com)
repo. JetBrains Mono variable woff2 were converted from the official
[JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) v2.304
release TTFs.

## Adding a font

1. Drop the woff2 files into `assets/fonts/`.
2. Add an entry to `FONT_CATALOG` in `index.ts` (family, files with
   weight/style descriptors, `articleLineHeight` tuning).
3. Add an entry to `fonts:` in `quartz.config.yaml` and rebuild.

## Developing this plugin

Sources live next to `dist/` (which is committed because Quartz loads local
plugins with plain Node at build time):

```bash
npm run build:font-switcher   # rebuilds dist/ from index.ts + components/
```

After editing `components/**` (the dropdown half), rebuild and restart the
Quartz build. Inline scripts are typed as modules (`export {}`) and the
esbuild step strips that marker before embedding them as component scripts.
