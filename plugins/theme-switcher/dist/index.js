import {
  getThemeRegistry,
  pathToRoot,
  setThemeRegistry
} from "./chunk-J5F6RGHR.js";

// index.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { h } from "preact";
import { joinSegments } from "@quartz-community/utils";
import { QuartzTheme, getThemeMeta, resolveThemeId } from "@quartz-themes/core";

// guard.ts
var GUARD = ":not([data-theme-selected])";
var RECURSIVE_AT = /* @__PURE__ */ new Set(["media", "supports", "layer", "container", "scope", "document"]);
function findTopLevel(css, from, stopChars) {
  let i = from;
  let quote = null;
  let depth = 0;
  while (i < css.length) {
    const c = css[i];
    if (quote) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      i++;
      continue;
    }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && stopChars.includes(c)) return i;
    i++;
  }
  return -1;
}
function matchBrace(css, openIdx) {
  let depth = 0;
  let i = openIdx;
  let quote = null;
  while (i < css.length) {
    const c = css[i];
    if (quote) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return css.length - 1;
}
function splitTopLevel(s) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (quote) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      i++;
      continue;
    }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
    i++;
  }
  parts.push(s.slice(start));
  return parts;
}
function rewriteSelector(selector) {
  const s = selector.trim();
  if (!s) return "";
  if (s.startsWith(":root")) {
    return "html" + s.replace(/:root/g, GUARD);
  }
  if (/^html(?![\w-])/.test(s)) {
    return s.replace(/^html/, "html" + GUARD);
  }
  return "html" + GUARD + " " + s;
}
function guardCss(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    if (/\s/.test(css[i])) {
      out += css[i];
      i++;
      continue;
    }
    if (css.startsWith("/*", i)) {
      const end = css.indexOf("*/", i + 2);
      if (end === -1) {
        out += css.slice(i);
        break;
      }
      out += css.slice(i, end + 2);
      i = end + 2;
      continue;
    }
    if (css[i] === "@") {
      const nameMatch = /^@([a-zA-Z-]+)/.exec(css.slice(i));
      const name = (nameMatch?.[1] ?? "").toLowerCase();
      const semi = findTopLevel(css, i, ";");
      const brace2 = findTopLevel(css, i, "{");
      if (brace2 === -1 || semi !== -1 && semi < brace2) {
        const end = semi === -1 ? css.length : semi + 1;
        out += css.slice(i, end);
        i = end;
        continue;
      }
      const inner2 = matchBrace(css, brace2);
      if (RECURSIVE_AT.has(name)) {
        out += css.slice(i, brace2 + 1) + guardCss(css.slice(brace2 + 1, inner2)) + "}";
      } else {
        out += css.slice(i, inner2 + 1);
      }
      i = inner2 + 1;
      continue;
    }
    const brace = findTopLevel(css, i, "{");
    if (brace === -1) {
      out += css.slice(i);
      break;
    }
    const selector = css.slice(i, brace);
    const inner = matchBrace(css, brace);
    const body = css.slice(brace, inner + 1);
    const rewritten = splitTopLevel(selector).map(rewriteSelector).filter(Boolean).join(", ");
    out += rewritten + " " + body;
    i = inner + 1;
  }
  return out;
}

// mermaidGuard.ts
var CANONICAL_VARS = [
  "--light",
  "--lightgray",
  "--gray",
  "--darkgray",
  "--dark",
  "--secondary",
  "--tertiary",
  "--highlight",
  "--textHighlight"
];
var RECURSIVE_AT2 = /* @__PURE__ */ new Set(["media", "supports", "layer", "container", "scope", "document"]);
function extractBlock(css) {
  const rules = [];
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf("{", i);
    if (brace === -1) break;
    const selector = css.slice(i, brace).replace(/^[\s;]+/, "").trim();
    let depth = 1;
    let j = brace + 1;
    let quote = null;
    while (j < css.length && depth > 0) {
      const c = css[j];
      if (quote) {
        if (c === "\\") {
          j += 2;
          continue;
        }
        if (c === quote) quote = null;
        j++;
        continue;
      }
      if (c === '"' || c === "'") {
        quote = c;
        j++;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      j++;
    }
    rules.push({ selector, body: css.slice(brace + 1, j - 1), end: j });
    i = j;
  }
  return rules;
}
function collectRootVars(css) {
  const light = {};
  const dark = {};
  const visit = (selector, body) => {
    if (selector.startsWith("@")) {
      const name = (selector.match(/^@([a-zA-Z-]+)/)?.[1] ?? "").toLowerCase();
      if (!RECURSIVE_AT2.has(name)) return;
      for (const r of extractBlock(body)) visit(r.selector, r.body);
      return;
    }
    if (!/(^|[\s,>+~])(html|:root)/.test(selector)) return;
    const isDark = selector.includes('saved-theme="dark"') || selector.includes("saved-theme=dark");
    const target = isDark ? dark : light;
    for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) {
      target[m[1]] = m[2].trim();
    }
  };
  for (const r of extractBlock(css)) visit(r.selector, r.body);
  return { light, dark };
}
function firstTopLevelComma(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) return i;
  }
  return -1;
}
function substituteVars(v, scope, seen) {
  let s = v;
  for (let k = 0; k < 30; k++) {
    const start = s.indexOf("var(");
    if (start === -1) break;
    let depth = 1;
    let j = start + 4;
    while (j < s.length && depth > 0) {
      if (s[j] === "(") depth++;
      else if (s[j] === ")") depth--;
      j++;
    }
    const inner = s.slice(start + 4, j - 1);
    const comma = firstTopLevelComma(inner);
    let repl = "";
    if (comma > -1) {
      const ref = inner.slice(0, comma).trim();
      const fallback = inner.slice(comma + 1).trim();
      repl = scope[ref] !== void 0 ? resolveVar(ref, scope, seen) : substituteVars(fallback, scope, seen);
    } else {
      const ref = inner.trim();
      repl = scope[ref] !== void 0 ? resolveVar(ref, scope, seen) : "";
    }
    s = s.slice(0, start) + repl + s.slice(j);
  }
  return s;
}
function resolveVar(name, scope, seen) {
  if (seen.has(name)) return "";
  const raw = scope[name];
  if (raw === void 0) return "";
  return substituteVars(raw, scope, /* @__PURE__ */ new Set([...seen, name]));
}
function evalArith(expr) {
  const tokens = expr.match(/-?\d*\.?\d+(?:%|px|rem|em|deg|vh|vw|s|ms)?|[+\-*/]/g) ?? [];
  const items = [];
  for (const t of tokens) {
    const m = /^(-?\d*\.?\d+)(%|px|rem|em|deg|vh|vw|s|ms)?$/.exec(t);
    items.push(m ? { v: parseFloat(m[1]), u: m[2] ?? "" } : t);
  }
  const pass1 = [];
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    if (it === "*" || it === "/") {
      const a = pass1.pop();
      const b = items[++k];
      pass1.push({ v: it === "*" ? a.v * b.v : a.v / b.v, u: a.u || b.u });
    } else {
      pass1.push(it);
    }
  }
  let acc = pass1[0] ?? { v: 0, u: "" };
  for (let k = 1; k < pass1.length; k += 2) {
    const op = pass1[k];
    const b = pass1[k + 1];
    acc = { v: op === "+" ? acc.v + b.v : acc.v - b.v, u: acc.u || b.u };
  }
  const out = Math.round(acc.v * 100) / 100;
  return acc.u ? `${out}${acc.u}` : String(out);
}
function evalCalcString(v) {
  let s = v;
  for (let k = 0; k < 20 && s.includes("calc("); k++) {
    s = s.replace(/calc\(([^()]*)\)/g, (_, e) => evalArith(e));
  }
  return s;
}
function computeMermaidPins(css, themeId) {
  const { light, dark } = collectRootVars(css);
  const darkScope = { ...light, ...dark };
  const errors = [];
  const lightPins = [];
  const darkPins = [];
  for (const name of CANONICAL_VARS) {
    for (const [mode, scope, pins] of [
      ["light", light, lightPins],
      ["dark", darkScope, darkPins]
    ]) {
      if (scope[name] === void 0) continue;
      let resolved = resolveVar(name, scope, /* @__PURE__ */ new Set());
      if (!resolved.includes("calc(")) continue;
      resolved = evalCalcString(resolved);
      if (resolved.includes("calc(") || resolved.includes("var(") || resolved.trim() === "") {
        errors.push(`[${themeId}] ${mode} ${name}: unresolved value "${resolved || "(empty)"}"`);
        continue;
      }
      pins.push(`${name}: ${resolved.trim()}`);
    }
  }
  let out = "";
  if (lightPins.length > 0 || darkPins.length > 0) {
    out += "\n/* mermaid pins (auto-generated: static values for calc()-based colors) */\n";
    if (lightPins.length > 0) out += `:root:root:root{${lightPins.join(";")}}
`;
    if (darkPins.length > 0) out += `:root:root:root[saved-theme="dark"]{${darkPins.join(";")}}
`;
  }
  return { css: out, errors };
}

// index.ts
var ASSETS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
var FONT_VAR_NAMES = [
  "--font-text",
  "--font-text-theme",
  "--font-interface",
  "--font-interface-theme",
  "--font-monospace",
  "--font-monospace-theme",
  "--h1-font",
  "--h2-font",
  "--h3-font",
  "--h4-font",
  "--h5-font",
  "--h6-font"
];
function extractFontVars(css) {
  const result = {};
  for (const varName of FONT_VAR_NAMES) {
    const pattern = new RegExp(`${varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+)`);
    const match = css.match(pattern);
    if (match?.[1]) {
      const value = match[1].trim();
      if (value && !value.startsWith("var(") && value !== "inherit") {
        result[varName] = value;
      }
    }
  }
  return result;
}
function harvestThemeCSS(themeId, modes) {
  const instance = QuartzTheme({ theme: themeId, mode: modes === "both" ? "both" : modes });
  const resources = instance.externalResources?.(void 0);
  return resources?.css?.map((c) => c.content).filter(Boolean).join("\n") ?? "";
}
async function minify(css) {
  try {
    const lightningcss = await import("lightningcss");
    const mod = lightningcss;
    const transformFn = mod.transform ?? mod.default?.transform;
    if (!transformFn) return css;
    const result = transformFn.call(null, {
      filename: "theme.css",
      code: Buffer.from(css),
      minify: true,
      // Some upstream @quartz-themes packages contain malformed selectors.
      // Browsers skip those individual rules; errorRecovery matches that.
      errorRecovery: true
    });
    return result.code.toString();
  } catch {
    return css;
  }
}
function ThemeSwitcherEmitter(options) {
  const configured = options?.themes ?? [];
  const g = globalThis;
  let bakedCss = null;
  let bakedModes = "both";
  if (options?.bakedTheme) {
    const resolvedBaked = resolveThemeId(options.bakedTheme);
    const meta = getThemeMeta(resolvedBaked);
    if (!meta) {
      throw new Error(`[theme-switcher] bakedTheme "${options.bakedTheme}" has no theme metadata`);
    }
    bakedModes = meta.modes.length === 1 ? meta.modes[0] : "both";
    const raw = harvestThemeCSS(options.bakedTheme, bakedModes);
    bakedCss = guardCss(raw);
    g.__quartzFonts = {
      themeName: options.bakedTheme,
      fonts: extractFontVars(raw),
      fontFiles: meta.fontFiles,
      fontDir: meta.fontDir ?? meta.name
    };
  }
  const bakedFonts = g.__quartzFonts;
  const registry = [];
  for (const entry of configured) {
    if (entry.id === "default") {
      registry.push({
        id: "default",
        label: entry.label ?? "Default",
        modes: entry.modes ?? bakedModes,
        file: null
      });
      continue;
    }
    if (entry.type === "typora" || entry.id.startsWith("typora-")) {
      registry.push({
        id: entry.id,
        label: entry.label ?? entry.id,
        modes: entry.modes ?? (entry.id === "typora-smoky" ? "dark" : "light"),
        file: `static/theme-${entry.id}.css`
      });
      continue;
    }
    try {
      const resolvedId = resolveThemeId(entry.id);
      const meta = getThemeMeta(resolvedId);
      const available = meta?.modes ?? ["dark", "light"];
      registry.push({
        id: entry.id,
        label: entry.label ?? meta?.name ?? entry.id,
        modes: entry.modes ?? (available.length === 1 ? available[0] : "both"),
        file: `static/theme-${entry.id}.css`
      });
    } catch (err) {
      console.warn(
        `[theme-switcher] skipping unknown theme "${entry.id}": ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`
      );
    }
  }
  setThemeRegistry(registry);
  return {
    name: "ThemeSwitcherThemes",
    externalResources() {
      if (bakedCss === null) return void 0;
      return {
        css: [],
        js: [],
        additionalHead: [
          (fileData) => h("link", {
            rel: "stylesheet",
            href: joinSegments(pathToRoot(fileData.slug), "static/theme-default.css"),
            "data-baked-theme": "true",
            "data-persist": "true"
          })
        ]
      };
    },
    async *emit({ argv }) {
      const outDir = path.join(argv.output, "static");
      await fs.promises.mkdir(outDir, { recursive: true });
      for (const theme of registry) {
        if (!theme.file) continue;
        let css;
        if (theme.id.startsWith("typora-")) {
          css = await fs.promises.readFile(path.join(ASSETS_DIR, `${theme.id}.css`), "utf-8");
        } else {
          css = harvestThemeCSS(theme.id, theme.modes);
          g.__quartzFonts = bakedFonts;
        }
        const { css: pins, errors } = computeMermaidPins(css, theme.id);
        if (errors.length > 0) {
          throw new Error(
            `[theme-switcher] mermaid-unsafe color variables \u2014 refusing to emit:
  ` + errors.join("\n  ")
          );
        }
        if (pins) css += pins;
        await fs.promises.writeFile(path.join(outDir, `theme-${theme.id}.css`), await minify(css));
        yield path.join(argv.output, "static", `theme-${theme.id}.css`);
      }
      if (bakedCss !== null) {
        await fs.promises.writeFile(path.join(outDir, "theme-default.css"), await minify(bakedCss));
        yield path.join(argv.output, "static", "theme-default.css");
      }
    }
  };
}
export {
  ThemeSwitcherEmitter as default,
  getThemeRegistry
};
