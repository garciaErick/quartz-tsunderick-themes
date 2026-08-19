import {
  getThemeRegistry,
  setThemeRegistry
} from "./chunk-PQOYTH5B.js";

// index.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QuartzTheme, getThemeMeta, resolveThemeId } from "@quartz-themes/core";
var ASSETS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
async function harvestPackageThemeCSS(themeId, modes) {
  const instance = QuartzTheme({
    theme: themeId,
    mode: modes === "both" ? "both" : modes
  });
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
      // Some upstream @quartz-themes packages contain malformed selectors
      // (e.g. a dark-mode prefix glued inside an attribute string). Browsers
      // skip those individual rules; errorRecovery makes lightningcss do
      // the same instead of rejecting the whole stylesheet.
      errorRecovery: true
    });
    return result.code.toString();
  } catch {
    return css;
  }
}
function ThemeSwitcherEmitter(options) {
  const configured = options?.themes ?? [];
  const registry = [];
  for (const entry of configured) {
    if (entry.id === "default") {
      registry.push({
        id: "default",
        label: entry.label ?? "Default",
        modes: entry.modes ?? "both",
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
      const modes = entry.modes ?? (available.length === 1 ? available[0] : "both");
      registry.push({
        id: entry.id,
        label: entry.label ?? meta?.name ?? entry.id,
        modes,
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
    async *emit({ argv }) {
      if (registry.length === 0) return;
      const outDir = path.join(argv.output, "static");
      await fs.promises.mkdir(outDir, { recursive: true });
      const g = globalThis;
      const fontsBackup = g.__quartzFonts;
      try {
        for (const theme of registry) {
          if (!theme.file) continue;
          const fileName = `theme-${theme.id}.css`;
          let css;
          if (theme.id.startsWith("typora-")) {
            css = await fs.promises.readFile(path.join(ASSETS_DIR, `${theme.id}.css`), "utf-8");
          } else {
            css = await harvestPackageThemeCSS(theme.id, theme.modes);
            g.__quartzFonts = fontsBackup;
          }
          await fs.promises.writeFile(path.join(outDir, fileName), await minify(css));
          yield path.join(argv.output, "static", fileName);
        }
      } finally {
        g.__quartzFonts = fontsBackup;
      }
    }
  };
}
export {
  ThemeSwitcherEmitter as default,
  getThemeRegistry
};
