/**
 * Mermaid guard — build-time insurance that every emitted theme file is
 * safe for mermaid's color parser.
 *
 * mermaid reads theme colors via getComputedStyle() and rejects unresolved
 * `calc()` strings ("Unsupported color format"), silently killing every
 * diagram. This module scans a theme's CSS, resolves the canonical Quartz
 * color variables through their var() chains, and if any resolved value
 * contains calc() it appends an unlayered, specificity-maxed static pin
 * computed from the theme's own accent math. Unresolvable values become
 * loud build errors.
 */

const CANONICAL_VARS = [
  "--light",
  "--lightgray",
  "--gray",
  "--darkgray",
  "--dark",
  "--secondary",
  "--tertiary",
  "--highlight",
  "--textHighlight",
] as const

const RECURSIVE_AT = new Set(["media", "supports", "layer", "container", "scope", "document"])

function extractBlock(css: string): Array<{ selector: string; body: string; end: number }> {
  const rules: Array<{ selector: string; body: string; end: number }> = []
  let i = 0
  while (i < css.length) {
    const brace = css.indexOf("{", i)
    if (brace === -1) break
    const selector = css
      .slice(i, brace)
      .replace(/^[\s;]+/, "")
      .trim()
    // find matching close brace (quote-aware)
    let depth = 1
    let j = brace + 1
    let quote: string | null = null
    while (j < css.length && depth > 0) {
      const c = css[j]
      if (quote) {
        if (c === "\\") {
          j += 2
          continue
        }
        if (c === quote) quote = null
        j++
        continue
      }
      if (c === '"' || c === "'") {
        quote = c
        j++
        continue
      }
      if (c === "{") depth++
      else if (c === "}") depth--
      j++
    }
    rules.push({ selector, body: css.slice(brace + 1, j - 1), end: j })
    i = j
  }
  return rules
}

function collectRootVars(css: string): {
  light: Record<string, string>
  dark: Record<string, string>
} {
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}

  const visit = (selector: string, body: string): void => {
    if (selector.startsWith("@")) {
      const name = (selector.match(/^@([a-zA-Z-]+)/)?.[1] ?? "").toLowerCase()
      if (!RECURSIVE_AT.has(name)) return
      for (const r of extractBlock(body)) visit(r.selector, r.body)
      return
    }
    // root-scope selectors: contain html or :root as a compound start
    if (!/(^|[\s,>+~])(html|:root)/.test(selector)) return
    const isDark = selector.includes('saved-theme="dark"') || selector.includes("saved-theme=dark")
    const target = isDark ? dark : light
    for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) {
      target[m[1]] = m[2].trim()
    }
  }

  for (const r of extractBlock(css)) visit(r.selector, r.body)
  return { light, dark }
}

function firstTopLevelComma(s: string): number {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === "(" || c === "[") depth++
    else if (c === ")" || c === "]") depth--
    else if (c === "," && depth === 0) return i
  }
  return -1
}

/**
 * Substitute var() references (balanced-paren aware) using the given scope.
 * Unknown refs resolve to their fallback when present, else to "".
 */
function substituteVars(v: string, scope: Record<string, string>, seen: Set<string>): string {
  let s = v
  for (let k = 0; k < 30; k++) {
    const start = s.indexOf("var(")
    if (start === -1) break
    // find the balanced close paren for this var(
    let depth = 1
    let j = start + 4
    while (j < s.length && depth > 0) {
      if (s[j] === "(") depth++
      else if (s[j] === ")") depth--
      j++
    }
    const inner = s.slice(start + 4, j - 1)
    const comma = firstTopLevelComma(inner)
    let repl = ""
    if (comma > -1) {
      const ref = inner.slice(0, comma).trim()
      const fallback = inner.slice(comma + 1).trim()
      repl =
        scope[ref] !== undefined
          ? resolveVar(ref, scope, seen)
          : substituteVars(fallback, scope, seen)
    } else {
      const ref = inner.trim()
      repl = scope[ref] !== undefined ? resolveVar(ref, scope, seen) : ""
    }
    s = s.slice(0, start) + repl + s.slice(j)
  }
  return s
}

function resolveVar(name: string, scope: Record<string, string>, seen: Set<string>): string {
  if (seen.has(name)) return ""
  const raw = scope[name]
  if (raw === undefined) return ""
  return substituteVars(raw, scope, new Set([...seen, name]))
}

interface Tok {
  v: number
  u: string
}

/** Evaluate a single calc() interior with CSS precedence (* / before + -). */
function evalArith(expr: string): string {
  const tokens = expr.match(/-?\d*\.?\d+(?:%|px|rem|em|deg|vh|vw|s|ms)?|[+\-*/]/g) ?? []
  const items: Array<Tok | string> = []
  for (const t of tokens) {
    const m = /^(-?\d*\.?\d+)(%|px|rem|em|deg|vh|vw|s|ms)?$/.exec(t)
    items.push(m ? { v: parseFloat(m[1]), u: m[2] ?? "" } : t)
  }
  // pass 1: * and /
  const pass1: Array<Tok | string> = []
  for (let k = 0; k < items.length; k++) {
    const it = items[k]
    if (it === "*" || it === "/") {
      const a = pass1.pop() as Tok
      const b = items[++k] as Tok
      pass1.push({ v: it === "*" ? a.v * b.v : a.v / b.v, u: a.u || b.u })
    } else {
      pass1.push(it)
    }
  }
  // pass 2: + and -
  let acc: Tok = (pass1[0] as Tok) ?? { v: 0, u: "" }
  for (let k = 1; k < pass1.length; k += 2) {
    const op = pass1[k] as string
    const b = pass1[k + 1] as Tok
    acc = { v: op === "+" ? acc.v + b.v : acc.v - b.v, u: acc.u || b.u }
  }
  const out = Math.round(acc.v * 100) / 100
  return acc.u ? `${out}${acc.u}` : String(out)
}

/** Replace every calc(...) (including nested) with its evaluated value. */
function evalCalcString(v: string): string {
  let s = v
  for (let k = 0; k < 20 && s.includes("calc("); k++) {
    s = s.replace(/calc\(([^()]*)\)/g, (_, e: string) => evalArith(e))
  }
  return s
}

export interface MermaidGuardResult {
  /** Pin CSS to append (empty string when the theme is already safe). */
  css: string
  /** Unresolvable variables — must fail the build loudly. */
  errors: string[]
}

export function computeMermaidPins(css: string, themeId: string): MermaidGuardResult {
  const { light, dark } = collectRootVars(css)
  const darkScope = { ...light, ...dark }
  const errors: string[] = []
  const lightPins: string[] = []
  const darkPins: string[] = []

  for (const name of CANONICAL_VARS) {
    for (const [mode, scope, pins] of [
      ["light", light, lightPins],
      ["dark", darkScope, darkPins],
    ] as const) {
      if (scope[name] === undefined) continue
      let resolved = resolveVar(name, scope, new Set())
      if (!resolved.includes("calc(")) continue // static already (or empty)
      resolved = evalCalcString(resolved)
      if (resolved.includes("calc(") || resolved.includes("var(") || resolved.trim() === "") {
        errors.push(`[${themeId}] ${mode} ${name}: unresolved value "${resolved || "(empty)"}"`)
        continue
      }
      pins.push(`${name}: ${resolved.trim()}`)
    }
  }

  let out = ""
  if (lightPins.length > 0 || darkPins.length > 0) {
    out += "\n/* mermaid pins (auto-generated: static values for calc()-based colors) */\n"
    if (lightPins.length > 0) out += `:root:root:root{${lightPins.join(";")}}\n`
    if (darkPins.length > 0) out += `:root:root:root[saved-theme="dark"]{${darkPins.join(";")}}\n`
  }
  return { css: out, errors }
}
