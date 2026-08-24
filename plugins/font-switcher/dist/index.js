import {
  getFontRegistry,
  pathToRoot,
  setFontRegistry
} from "./chunk-I773FKEV.js";

// index.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { h } from "preact";
import { joinSegments } from "@quartz-community/utils";
var ASSETS_FONTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "fonts"
);
var MONO_FALLBACK = "ui-monospace, SFMono-Regular, Menlo, monospace";
var FONT_CATALOG = {
  "operator-mono": {
    id: "operator-mono",
    family: "Operator Mono",
    files: [
      { file: "OperatorMono-ExtraLight.woff2", weight: "200", style: "normal" },
      { file: "OperatorMono-ExtraLightItalic.woff2", weight: "200", style: "italic" },
      { file: "OperatorMono-Light.woff2", weight: "300", style: "normal" },
      { file: "OperatorMono-LightItalic.woff2", weight: "300", style: "italic" },
      { file: "OperatorMono-Regular.woff2", weight: "400", style: "normal" },
      { file: "OperatorMono-Italic.woff2", weight: "400", style: "italic" },
      { file: "OperatorMono-Medium.woff2", weight: "500", style: "normal" },
      { file: "OperatorMono-MediumItalic.woff2", weight: "500", style: "italic" },
      { file: "OperatorMono-Bold.woff2", weight: "700", style: "normal" },
      { file: "OperatorMono-BoldItalic.woff2", weight: "700", style: "italic" }
    ],
    articleLineHeight: "1.7rem"
  },
  "jetbrains-mono": {
    id: "jetbrains-mono",
    family: "JetBrains Mono",
    files: [
      { file: "JetBrainsMono-VariableFont_wght.woff2", weight: "100 800", style: "normal" },
      {
        file: "JetBrainsMono-Italic-VariableFont_wght.woff2",
        weight: "100 800",
        style: "italic"
      }
    ],
    articleLineHeight: "1.65rem"
  }
};
function fontStack(def) {
  return `"${def.family}", ${MONO_FALLBACK}`;
}
function fontFaceCss(defs) {
  const faces = defs.flatMap(
    (def) => def.files.map(
      (f) => `@font-face {
  font-family: "${def.family}";
  src: url("fonts/${f.file}") format("woff2");
  font-weight: ${f.weight};
  font-style: ${f.style};
  font-display: swap;
}`
    )
  );
  return `/* font-switcher: @font-face declarations (files under static/fonts/) */
${faces.join("\n")}
`;
}
function overrideCss(def, guarded) {
  const scope = guarded ? "html:not([data-font-selected])" : ":root";
  const prefix = guarded ? "html:not([data-font-selected]) " : "";
  const stack = fontStack(def);
  const headings = ["h1", "h2", "h3", "h4", "h5", "h6"].map((heading) => `${prefix}${heading}`).join(", ");
  return `/* font-switcher: ${def.id} (${def.family}) \u2014 full-site font override */
${scope} {
  /* Obsidian cascade override slots (respected by every quartz-themes theme) */
  --font-text-override: ${stack};
  --font-interface-override: ${stack};
  --font-monospace-override: ${stack};
  --font-print-override: ${stack};

  /* Quartz typography vars (beat quartz-fonts' @layer rules unlayered) */
  --titleFont: ${stack};
  --headerFont: ${stack};
  --bodyFont: ${stack};
  --codeFont: ${stack};
}

/* quartz-fonts emits concrete unlayered h1\u2013h6 rules; re-assert with one
   extra specificity notch so the selected font wins regardless of head order. */
${headings} {
  font-family: ${stack};
}

/* Readability: monospace at paragraph length wants a touch more leading
   than the base 1.6rem. Scoped to article content so sidebars, TOC and
   menus keep their compact rhythm. */
${prefix}article p,
${prefix}article li,
${prefix}article blockquote {
  line-height: ${def.articleLineHeight};
}
`;
}
async function minify(css) {
  try {
    const lightningcss = await import("lightningcss");
    const mod = lightningcss;
    const transformFn = mod.transform ?? mod.default?.transform;
    if (!transformFn) return css;
    const result = transformFn.call(null, {
      filename: "font.css",
      code: Buffer.from(css),
      minify: true,
      errorRecovery: true
    });
    return result.code.toString();
  } catch {
    return css;
  }
}
function FontSwitcherEmitter(options) {
  const configured = options?.fonts ?? [];
  let bakedDef = null;
  if (options?.bakedFont) {
    bakedDef = FONT_CATALOG[options.bakedFont] ?? null;
    if (!bakedDef) {
      throw new Error(
        `[font-switcher] bakedFont "${options.bakedFont}" is not in the font catalog (known: ${Object.keys(FONT_CATALOG).join(", ")})`
      );
    }
  }
  const registry = [];
  for (const entry of configured) {
    if (entry.id === "default") {
      registry.push({
        id: "default",
        label: entry.label ?? bakedDef?.family ?? "Default",
        file: null,
        stack: bakedDef ? fontStack(bakedDef) : null
      });
      continue;
    }
    const def = FONT_CATALOG[entry.id];
    if (!def) {
      console.warn(
        `[font-switcher] skipping unknown font "${entry.id}" (known: ${Object.keys(FONT_CATALOG).join(", ")})`
      );
      continue;
    }
    registry.push({
      id: entry.id,
      label: entry.label ?? def.family,
      file: `static/font-${entry.id}.css`,
      stack: fontStack(def)
    });
  }
  setFontRegistry(registry);
  const referencedDefs = /* @__PURE__ */ new Map();
  for (const font of registry) {
    const def = FONT_CATALOG[font.id];
    if (def) referencedDefs.set(def.id, def);
  }
  if (bakedDef) referencedDefs.set(bakedDef.id, bakedDef);
  const hasBaked = bakedDef !== null;
  return {
    name: "FontSwitcherFonts",
    externalResources() {
      if (registry.length === 0) return void 0;
      return {
        css: [],
        js: [],
        additionalHead: [
          (fileData) => h("link", {
            rel: "stylesheet",
            href: joinSegments(pathToRoot(fileData.slug), "static/font-faces.css"),
            "data-persist": "true"
          }),
          ...hasBaked ? [
            (fileData) => h("link", {
              rel: "stylesheet",
              href: joinSegments(pathToRoot(fileData.slug), "static/font-default.css"),
              "data-baked-font": "true",
              "data-persist": "true"
            })
          ] : []
        ]
      };
    },
    async *emit({ argv }) {
      const outDir = path.join(argv.output, "static");
      const fontsDir = path.join(outDir, "fonts");
      await fs.promises.mkdir(fontsDir, { recursive: true });
      if (referencedDefs.size > 0) {
        await fs.promises.writeFile(
          path.join(outDir, "font-faces.css"),
          await minify(fontFaceCss([...referencedDefs.values()]))
        );
        yield path.join(argv.output, "static", "font-faces.css");
        for (const def of referencedDefs.values()) {
          for (const spec of def.files) {
            const src = path.join(ASSETS_FONTS_DIR, spec.file);
            if (!fs.existsSync(src)) {
              throw new Error(`[font-switcher] missing font file: ${src}`);
            }
            await fs.promises.copyFile(src, path.join(fontsDir, spec.file));
            yield path.join(argv.output, "static", "fonts", spec.file);
          }
        }
      }
      for (const font of registry) {
        if (!font.file) continue;
        const def = FONT_CATALOG[font.id];
        if (!def) continue;
        await fs.promises.writeFile(
          path.join(outDir, `font-${font.id}.css`),
          await minify(overrideCss(def, false))
        );
        yield path.join(argv.output, "static", `font-${font.id}.css`);
      }
      if (bakedDef) {
        await fs.promises.writeFile(
          path.join(outDir, "font-default.css"),
          await minify(overrideCss(bakedDef, true))
        );
        yield path.join(argv.output, "static", "font-default.css");
      }
    }
  };
}
export {
  FontSwitcherEmitter as default,
  getFontRegistry
};
