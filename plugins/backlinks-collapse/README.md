# backlinks-collapse

Backlinks section with a collapsible header — a house wrapper around
[`@quartz-community/backlinks`](https://github.com/quartz-community/backlinks).

Upstream renders the section as a bare `<h3>` + overflow list with no way to
fold it away. This wrapper keeps everything upstream does — i18n titles,
`hideWhenEmpty`, the overflow gradient observer — and rewrites the rendered
vdom so the `<h3>` lives inside a `<button class="backlinks-header">` with a
chevron, exactly mirroring the TOC plugin's collapse pattern:

- click toggles `.collapsed` on the button **and** the sibling list
- `aria-expanded` / `aria-controls` are maintained
- collapsed state shrinks the section to the header row (desktop) or hides
  the list (mobile card row)

## Options

| Option          | Type      | Default | Description                                              |
| --------------- | --------- | ------- | -------------------------------------------------------- |
| `hideWhenEmpty` | `boolean` | `true`  | Hide the section when no pages link to the current page. |

## Layout

Registered as a single component (`Backlinks`) — layout defaults to the
right sidebar, priority 20 (same as upstream backlinks).

## Layering contract

The engine's `quartz/styles/custom.scss` gives backlinks "no-squish"
guarantees (`flex: 0 0 auto`, `max-height: none`) that are emitted
**unlayered**, which would defeat this plugin's layered collapse rules. Those
rules are guarded with `:not(:has(button.backlinks-header.collapsed))` so
they stand down while collapsed. If you author child-site styles that touch
`.backlinks` sizing, apply the same guard.
