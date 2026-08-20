# theme-switcher

A local Quartz v5 plugin that adds a **runtime theme dropdown** to the left
toolbar. Visitors can switch between every theme from
[quartz-themes](https://github.com/saberzero1/quartz-themes) plus custom
palette ports, with the choice persisted in `localStorage`.

## How it works

```
build time   ./plugins/theme-switcher (emitter)
             ├── bakedTheme option: harvests the default theme, guard-scopes
             │   EVERY rule under html:not([data-theme-selected]), emits
             │   static/theme-default.css, injects it per-page via
             │   <link data-baked-theme> (replaces @quartz-themes/core)
             ├── per-theme harvest → public/static/theme-<id>.css
             │   (each auto-verified calc-free in the mermaid color vars;
             │    unresolvable values fail the build loudly)
             └── theme manifest data → ThemeSwitcher component (SSR menu)

runtime      selecting a theme sets html[data-theme-selected] (early script,
             pre-paint) which fully neutralizes the guarded baked css, and
             disables its <link>; the chosen theme css loads alone on top of
             the neutral quartz-base — pixel-identical to the official
             quartz-themes preview sites.
```

- The baked default downloads on every cold load (~300KB) even when another
  theme is stored — static HTML can't know the visitor's choice server-side.
  Selected themes are fetched only on demand.
- `?theme=<id>` on any URL previews a theme without persisting it.
- Single-mode (dark-only / light-only) themes are marked with a badge and
  force the site into their supported mode (their css hides the darkmode
  toggle via `button.darkmode{display:none}`).
- `globalThis.__quartzFonts` handoff for @quartz-community/quartz-fonts is
  performed by this plugin (read lazily by quartz-fonts at
  externalResources time).

## URL preview parameter

Append `?theme=<id>` to any page URL to preview a theme **without
persisting it** — nothing is written to `localStorage`, so removing the
parameter restores the previous selection on next load. `?theme=default`
previews the baked-in theme. Single-mode previews still force their mode for
that load. Useful for QA links and sharing theme previews.

## Adding a theme

1. Install the package:

   ```bash
   npm install @quartz-themes/<theme-name>
   ```

2. Add an entry to `themes:` under the `./plugins/theme-switcher` plugin in
   `quartz.config.yaml`:

   ```yaml
   - id: <theme-name>
     label: <Pretty Label>
   ```

3. Rebuild. Light/dark support is auto-detected from the package metadata;
   you can override with `modes: dark | light | both` if needed.

## Custom palette themes

Drop a CSS file in `assets/<id>.css` overriding the nine canonical Quartz
color variables (`--light`, `--lightgray`, `--gray`, `--darkgray`, `--dark`,
`--secondary`, `--tertiary`, `--highlight`, `--textHighlight`) plus
`--accent-h/s/l`, then reference it with `type: typora` (or any id starting
with `typora-`). Use static values only — `calc()` in these variables breaks
mermaid (see `quartz/styles/custom.scss`). `typora-milky` (light) and
`typora-smoky` (dark) port the palettes of
[troennes/quartz-theme-typora](https://github.com/troennes/quartz-theme-typora).

## Developing this plugin

Sources live next to `dist/` (which is committed because Quartz loads local
plugins with plain Node at build time):

```bash
npm run build:theme-switcher   # rebuilds dist/ from index.ts + components/
```

After editing `components/**` (the dropdown half), rebuild and restart the
Quartz build. Inline scripts are typed as modules (`export {}`) and the
esbuild step strips that marker before embedding them as component scripts.

## Known limitations

- Some upstream theme packages ship malformed selectors (e.g. `aaaa`'s
  `[data-task=", html[saved-theme="dark"] "]`). Browsers skip those rules;
  we minify with lightningcss `errorRecovery: true` to match.
- Themes that define `--tertiary` via `calc()` may still trip mermaid's
  color parser while active (same class of bug as the default theme's pin
  in `custom.scss`).
