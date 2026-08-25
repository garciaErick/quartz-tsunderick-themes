# reader-zen

Zen reader mode — a house wrapper around
[`@quartz-community/reader-mode`](https://github.com/quartz-community/reader-mode).

The toolbar button behaves exactly like upstream reader mode (toggles
`html[reader-mode]`, dispatches `readermodechange`). While reader mode is
**on**, a floating pill appears at the bottom-center of the viewport:

| Control      | html attribute            | Effect                                                                                                                                                                                                                                                                           |
| ------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Exit**     | _(turns reader mode off)_ | The guaranteed escape hatch — in full-width zen the toolbar reader button is `display: none` with its sidebar, so without this button a page reload is the only way out. The `Escape` key exits too (skipped when a field is focused, e.g. the search overlay).                  |
| _Italic_     | `[data-zen-italic="on"]`  | Article body text (`p`, `li`, `blockquote`) renders italic                                                                                                                                                                                                                       |
| _Full width_ | `[data-zen-width="full"]` | Sidebars leave the grid entirely, `.page` uncaps its max-width, breadcrumbs hide. **Defaults ON** for first-time visitors — entering zen should feel like zen, not "the font changed". An explicit toggle-off persists (`localStorage: "normal"`) and is respected from then on. |

_Italic_ and _Full width_ persist in `localStorage` (`quartz-zen-italic`,
`quartz-zen-width`) and only take effect while reader mode is on — the
attributes are inert outside it. The pill is re-created on every SPA `nav`
(with `addCleanup` teardown), so it survives client-side navigation safely.

## Styling home

The zen rules live in the engine's `quartz/styles/custom.scss`, **unlayered**
on purpose: they must beat both the layered base layout (`.page` max-width,
the `#quartz-body` grid) and any unlayered theme css loaded later. See the
layering-hazard note at the top of that file.

## Layout

Registered as a single component (`ReaderMode`) — layout defaults to the
left sidebar toolbar, priority 35 (same as upstream reader-mode). Page-type
layout excludes that referenced `reader-mode` by name should reference
`reader-zen` instead.
