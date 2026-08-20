/**
 * ThemeSwitcher emitter — owns ALL theme CSS for the site:
 *
 *  1. Bakes the default theme (bakedTheme option) via the public
 *     @quartz-themes/core factory, guard-scopes every rule under
 *     html:not([data-theme-selected]), emits static/theme-default.css and
 *     injects it as a per-page <link data-baked-theme> via additionalHead.
 *     When a runtime theme is selected, the guard (plus link disabling)
 *     makes the baked theme fully stand down — no specificity bleed, no
 *     property bleed.
 *  2. Emits one lazy CSS file per switchable theme (static/theme-<id>.css),
 *     each verified calc-free in the mermaid-critical color variables
 *     (auto-pinned from the theme's own accent math when needed).
 *  3. Publishes the resolved theme list to the shared registry so the
 *     ThemeSwitcher component can SSR the dropdown.
 *
 * It also performs the globalThis.__quartzFonts registry handoff for
 * @quartz-community/quartz-fonts (which reads it lazily at
 * externalResources() time), replacing the @quartz-themes/core transformer.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { h } from "preact"
import type { QuartzEmitterPlugin } from "@quartz-community/types"
import type { FilePath } from "@quartz-community/utils"
import { joinSegments } from "@quartz-community/utils"
import { QuartzTheme, getThemeMeta, resolveThemeId } from "@quartz-themes/core"
import { guardCss } from "./guard"
import { computeMermaidPins } from "./mermaidGuard"
import {
  getThemeRegistry,
  setThemeRegistry,
  pathToRoot,
  type SwitchableTheme,
  type ThemeModes,
} from "./shared"

interface ThemeConfigEntry {
  id: string
  label?: string
  /** Override light/dark support detection ("both" | "dark" | "light"). */
  modes?: ThemeModes
  /** "package" (default, harvested from @quartz-themes/*) or "typora" (assets/<id>.css). */
  type?: "package" | "typora"
}

interface ThemeSwitcherOptions {
  /** Theme id baked as the site default (harvested from @quartz-themes/*). */
  bakedTheme?: string
  themes?: ThemeConfigEntry[]
}

const ASSETS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "assets")

/** Same inter-plugin contract @quartz-themes/core uses for quartz-fonts. */
const FONT_VAR_NAMES = [
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
  "--h6-font",
] as const

function extractFontVars(css: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const varName of FONT_VAR_NAMES) {
    const pattern = new RegExp(`${varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+)`)
    const match = css.match(pattern)
    if (match?.[1]) {
      const value = match[1].trim()
      if (value && !value.startsWith("var(") && value !== "inherit") {
        result[varName] = value
      }
    }
  }
  return result
}

/** Compose a theme's full CSS via the public QuartzTheme transformer factory. */
function harvestThemeCSS(themeId: string, modes: ThemeModes): string {
  const instance = QuartzTheme({ theme: themeId, mode: modes === "both" ? "both" : modes })
  const resources = instance.externalResources?.(undefined as never)
  return (
    resources?.css
      ?.map((c) => c.content)
      .filter(Boolean)
      .join("\n") ?? ""
  )
}

async function minify(css: string): Promise<string> {
  try {
    const lightningcss = await import("lightningcss")
    const mod = lightningcss as unknown as {
      transform?: (opts: Record<string, unknown>) => { code: Buffer }
      default?: { transform: (opts: Record<string, unknown>) => { code: Buffer } }
    }
    const transformFn = mod.transform ?? mod.default?.transform
    if (!transformFn) return css
    const result = transformFn.call(null, {
      filename: "theme.css",
      code: Buffer.from(css),
      minify: true,
      // Some upstream @quartz-themes packages contain malformed selectors.
      // Browsers skip those individual rules; errorRecovery matches that.
      errorRecovery: true,
    })
    return result.code.toString()
  } catch {
    return css
  }
}

export default function ThemeSwitcherEmitter(
  options?: ThemeSwitcherOptions,
): ReturnType<QuartzEmitterPlugin<ThemeSwitcherOptions>> {
  const configured = options?.themes ?? []
  const g = globalThis as Record<string, unknown>

  // ----- baked default theme (factory time: registry + fonts handoff) -----
  let bakedCss: string | null = null
  let bakedModes: ThemeModes = "both"
  if (options?.bakedTheme) {
    const resolvedBaked = resolveThemeId(options.bakedTheme)
    const meta = getThemeMeta(resolvedBaked)
    if (!meta) {
      throw new Error(`[theme-switcher] bakedTheme "${options.bakedTheme}" has no theme metadata`)
    }
    bakedModes = meta.modes.length === 1 ? meta.modes[0] : "both"
    const raw = harvestThemeCSS(options.bakedTheme, bakedModes)
    bakedCss = guardCss(raw)
    g.__quartzFonts = {
      themeName: options.bakedTheme,
      fonts: extractFontVars(raw),
      fontFiles: meta.fontFiles,
      fontDir: meta.fontDir ?? meta.name,
    }
  }
  const bakedFonts = g.__quartzFonts

  // ----- resolve switchable-theme metadata into the shared registry -----
  const registry: SwitchableTheme[] = []
  for (const entry of configured) {
    if (entry.id === "default") {
      registry.push({
        id: "default",
        label: entry.label ?? "Default",
        modes: entry.modes ?? bakedModes,
        file: null,
      })
      continue
    }

    if (entry.type === "typora" || entry.id.startsWith("typora-")) {
      registry.push({
        id: entry.id,
        label: entry.label ?? entry.id,
        modes: entry.modes ?? (entry.id === "typora-smoky" ? "dark" : "light"),
        file: `static/theme-${entry.id}.css`,
      })
      continue
    }

    try {
      const resolvedId = resolveThemeId(entry.id)
      const meta = getThemeMeta(resolvedId)
      const available = meta?.modes ?? ["dark", "light"]
      registry.push({
        id: entry.id,
        label: entry.label ?? meta?.name ?? entry.id,
        modes: entry.modes ?? (available.length === 1 ? available[0] : "both"),
        file: `static/theme-${entry.id}.css`,
      })
    } catch (err) {
      console.warn(
        `[theme-switcher] skipping unknown theme "${entry.id}": ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`,
      )
    }
  }
  setThemeRegistry(registry)

  return {
    name: "ThemeSwitcherThemes",
    externalResources() {
      if (bakedCss === null) return undefined
      return {
        css: [],
        js: [],
        additionalHead: [
          (fileData: { slug: string }) =>
            h("link", {
              rel: "stylesheet",
              href: joinSegments(pathToRoot(fileData.slug), "static/theme-default.css"),
              "data-baked-theme": "true",
              "data-persist": "true",
            }),
        ],
      }
    },
    async *emit({ argv }) {
      const outDir = path.join(argv.output, "static")
      await fs.promises.mkdir(outDir, { recursive: true })

      // ----- switchable themes (lazy, one file each) -----
      for (const theme of registry) {
        if (!theme.file) continue
        let css: string
        if (theme.id.startsWith("typora-")) {
          css = await fs.promises.readFile(path.join(ASSETS_DIR, `${theme.id}.css`), "utf-8")
        } else {
          css = harvestThemeCSS(theme.id, theme.modes)
          // The factory communicates fonts via globalThis; restore the
          // baked theme's handoff after each harvest.
          g.__quartzFonts = bakedFonts
        }

        // mermaid insurance: resolve canonical color vars, pin calc() ones
        const { css: pins, errors } = computeMermaidPins(css, theme.id)
        if (errors.length > 0) {
          throw new Error(
            `[theme-switcher] mermaid-unsafe color variables — refusing to emit:\n  ` +
              errors.join("\n  "),
          )
        }
        if (pins) css += pins

        await fs.promises.writeFile(path.join(outDir, `theme-${theme.id}.css`), await minify(css))
        yield path.join(argv.output, "static", `theme-${theme.id}.css`) as FilePath
      }

      // ----- baked default theme (always loaded, guard-scoped) -----
      if (bakedCss !== null) {
        await fs.promises.writeFile(path.join(outDir, "theme-default.css"), await minify(bakedCss))
        yield path.join(argv.output, "static", "theme-default.css") as FilePath
      }
    },
  }
}

// Re-export for consumers/tests
export { getThemeRegistry }
