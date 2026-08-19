/**
 * ThemeSwitcher emitter — emits one CSS file per configured theme into
 * `public/static/theme-<id>.css`, harvested from the public
 * `@quartz-themes/core` factory so the output is byte-identical to what
 * a build-time-only theme would have injected.
 *
 * Custom palette themes (typora-*) are copied verbatim from assets/.
 *
 * The resolved theme list is published to the shared registry at factory
 * time so the ThemeSwitcher component can SSR the dropdown before any
 * page renders (this emitter is instantiated before PageTypeDispatcher).
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { FilePath } from "@quartz-community/utils"
import type { QuartzEmitterPlugin } from "@quartz-community/types"
import { QuartzTheme, getThemeMeta, resolveThemeId } from "@quartz-themes/core"
import { getThemeRegistry, setThemeRegistry, type SwitchableTheme, type ThemeModes } from "./shared"

interface ThemeConfigEntry {
  id: string
  label?: string
  /** Override light/dark support detection ("both" | "dark" | "light"). */
  modes?: ThemeModes
  /** "package" (default, harvested from @quartz-themes/*) or "typora" (assets/<id>.css). */
  type?: "package" | "typora"
}

interface ThemeSwitcherOptions {
  themes?: ThemeConfigEntry[]
}

const ASSETS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "assets")

/**
 * Compose a theme's full CSS via the public QuartzTheme transformer factory.
 * Mirrors exactly what the site would get from configuring that theme at
 * build time (fonts, icon CSS, aspect layers, template overrides).
 */
async function harvestPackageThemeCSS(themeId: string, modes: ThemeModes): Promise<string> {
  const instance = QuartzTheme({
    theme: themeId,
    mode: modes === "both" ? "both" : modes,
  })
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
      // Some upstream @quartz-themes packages contain malformed selectors
      // (e.g. a dark-mode prefix glued inside an attribute string). Browsers
      // skip those individual rules; errorRecovery makes lightningcss do
      // the same instead of rejecting the whole stylesheet.
      errorRecovery: true,
    })
    return result.code.toString()
  } catch {
    // lightningcss parse failure or unavailability — fall back to raw CSS
    return css
  }
}

export default function ThemeSwitcherEmitter(
  options?: ThemeSwitcherOptions,
): ReturnType<QuartzEmitterPlugin> {
  const configured = options?.themes ?? []

  // Resolve metadata at factory time so the registry is ready before
  // the ThemeSwitcher component renders any page.
  const registry: SwitchableTheme[] = []
  for (const entry of configured) {
    if (entry.id === "default") {
      registry.push({
        id: "default",
        label: entry.label ?? "Default",
        modes: entry.modes ?? "both",
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
      const modes: ThemeModes = entry.modes ?? (available.length === 1 ? available[0] : "both")
      registry.push({
        id: entry.id,
        label: entry.label ?? meta?.name ?? entry.id,
        modes,
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
    async *emit({ argv }) {
      if (registry.length === 0) return

      const outDir = path.join(argv.output, "static")
      await fs.promises.mkdir(outDir, { recursive: true })

      // The QuartzTheme factory communicates fonts to other plugins via
      // globalThis.__quartzFonts; harvesting many themes must not clobber
      // whatever the site's active theme already published.
      const g = globalThis as Record<string, unknown>
      const fontsBackup = g.__quartzFonts
      try {
        for (const theme of registry) {
          if (!theme.file) continue
          const fileName = `theme-${theme.id}.css`

          let css: string
          if (theme.id.startsWith("typora-")) {
            css = await fs.promises.readFile(path.join(ASSETS_DIR, `${theme.id}.css`), "utf-8")
          } else {
            css = await harvestPackageThemeCSS(theme.id, theme.modes)
            g.__quartzFonts = fontsBackup
          }

          await fs.promises.writeFile(path.join(outDir, fileName), await minify(css))
          yield path.join(argv.output, "static", fileName) as FilePath
        }
      } finally {
        g.__quartzFonts = fontsBackup
      }
    },
  }
}

// Re-export for consumers/tests
export { getThemeRegistry }
