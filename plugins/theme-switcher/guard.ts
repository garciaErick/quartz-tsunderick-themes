/**
 * CSS guard rewriter — scopes every style rule in a stylesheet under
 * `html:not([data-theme-selected])` so the baked default theme fully
 * stands down whenever a runtime theme is active.
 *
 * - `:root` pseudo-classes are replaced by the guard pseudo-class
 *   (specificity-equivalent: both are 0,1,0) and anchored to `html`.
 * - Other selectors get an `html:not([data-theme-selected]) ` prefix.
 * - `@media` / `@supports` / `@layer` / `@container` / `@scope` blocks are
 *   recursed into; `@font-face` / `@keyframes` / `@property` etc. are
 *   copied verbatim (they have no element selectors).
 */

const GUARD = ":not([data-theme-selected])"
const RECURSIVE_AT = new Set(["media", "supports", "layer", "container", "scope", "document"])

function findTopLevel(css: string, from: number, stopChars: string): number {
  let i = from
  let quote: string | null = null
  let depth = 0
  while (i < css.length) {
    const c = css[i]
    if (quote) {
      if (c === "\\") {
        i += 2
        continue
      }
      if (c === quote) quote = null
      i++
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      i++
      continue
    }
    if (c === "(" || c === "[") depth++
    else if (c === ")" || c === "]") depth--
    else if (depth === 0 && stopChars.includes(c)) return i
    i++
  }
  return -1
}

function matchBrace(css: string, openIdx: number): number {
  let depth = 0
  let i = openIdx
  let quote: string | null = null
  while (i < css.length) {
    const c = css[i]
    if (quote) {
      if (c === "\\") {
        i += 2
        continue
      }
      if (c === quote) quote = null
      i++
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      i++
      continue
    }
    if (c === "{") depth++
    else if (c === "}") {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return css.length - 1
}

function splitTopLevel(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (quote) {
      if (c === "\\") {
        i += 2
        continue
      }
      if (c === quote) quote = null
      i++
      continue
    }
    if (c === '"' || c === "'") {
      quote = c
      i++
      continue
    }
    if (c === "(" || c === "[") depth++
    else if (c === ")" || c === "]") depth--
    else if (c === "," && depth === 0) {
      parts.push(s.slice(start, i))
      start = i + 1
    }
    i++
  }
  parts.push(s.slice(start))
  return parts
}

function rewriteSelector(selector: string): string {
  const s = selector.trim()
  if (!s) return ""
  if (s.startsWith(":root")) {
    // replace every :root with the guard pseudo (0,1,0 each) and anchor to html
    return "html" + s.replace(/:root/g, GUARD)
  }
  if (/^html(?![\w-])/.test(s)) {
    return s.replace(/^html/, "html" + GUARD)
  }
  return "html" + GUARD + " " + s
}

export function guardCss(css: string): string {
  let out = ""
  let i = 0
  while (i < css.length) {
    if (/\s/.test(css[i])) {
      out += css[i]
      i++
      continue
    }
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i + 2)
      if (end === -1) {
        out += css.slice(i)
        break
      }
      out += css.slice(i, end + 2)
      i = end + 2
      continue
    }
    if (css[i] === "@") {
      const nameMatch = /^@([a-zA-Z-]+)/.exec(css.slice(i))
      const name = (nameMatch?.[1] ?? "").toLowerCase()
      const semi = findTopLevel(css, i, ";")
      const brace = findTopLevel(css, i, "{")
      if (brace === -1 || (semi !== -1 && semi < brace)) {
        // statement at-rule (@layer a, b; / @import …; / @charset …;)
        const end = semi === -1 ? css.length : semi + 1
        out += css.slice(i, end)
        i = end
        continue
      }
      const inner = matchBrace(css, brace)
      if (RECURSIVE_AT.has(name)) {
        out += css.slice(i, brace + 1) + guardCss(css.slice(brace + 1, inner)) + "}"
      } else {
        // @font-face, @keyframes, @property, @counter-style, @page, … — verbatim
        out += css.slice(i, inner + 1)
      }
      i = inner + 1
      continue
    }
    // style rule
    const brace = findTopLevel(css, i, "{")
    if (brace === -1) {
      out += css.slice(i)
      break
    }
    const selector = css.slice(i, brace)
    const inner = matchBrace(css, brace)
    const body = css.slice(brace, inner + 1)
    const rewritten = splitTopLevel(selector).map(rewriteSelector).filter(Boolean).join(", ")
    out += rewritten + " " + body
    i = inner + 1
  }
  return out
}
