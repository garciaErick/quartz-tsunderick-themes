---
title: Engine Theme Preview
---

This is the **engine's own dev preview page** — a small sample of styled content so you can run `npx quartz build --serve` here and check themes, fonts, and plugins without a child site.

Use the theme switcher in the toolbar to cycle the built-in themes.

## Typography

The quick brown fox jumps over the lazy dog. `inline code`, _italics_, **bold**, ~~strikethrough~~, and a [link](https://quartz.jzhao.xyz).

> Blockquotes look like this. Very distinguished.

### Code

```ts
export function greet(name: string): string {
  return `Hello, ${name}!`
}
```

### Math

Euler's identity: $e^{i\pi} + 1 = 0$

### Table

| Feature | Status |
| ------- | ------ |
| Themes  | 17     |
| Plugins | 5      |

### Callout

> [!note]
> Callouts render with theme-aware colors.

### Lists

1. Ordered item
2. Another item
   - Nested bullet
   - Another nested bullet

---

Real sites live in child repos and bring their own `content/`, `quartz.config.yaml`, and `static/` branding. See the engine README for the child-site contract.
