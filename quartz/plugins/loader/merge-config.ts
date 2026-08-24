import fs from "fs"
import path from "path"
import YAML from "yaml"
import type { LayoutConfig, PluginSource, QuartzPluginsJson } from "./types"

/**
 * Config layering: `quartz.config.default.yaml` (engine baseline, extracted
 * into every child site by engine/scripts/build.sh) beneath
 * `quartz.config.yaml` (site config). The merge is **replace-per-plugin**
 * keyed by normalized source:
 *
 * - a child entry with the same source replaces the engine's default entry
 *   wholesale (enabled/order/options/layout),
 * - engine defaults not mentioned by the child are inherited as-is,
 * - child-only entries are appended.
 *
 * Opt OUT of an inherited default by listing it in the child config with
 * `enabled: false` — the child's replacement entry is kept but disabled,
 * which is the existing child-config idiom for disabled plugins.
 *
 * `configuration` shallow-merges (child wins per key). `layout` merges per
 * key; `byPageType` merges per page type, and each page type's `positions`
 * merge per position — so a child clearing `positions.right` does not clobber
 * a default `exclude` list or the other positions.
 *
 * The CLI (`npx quartz plugin add/remove/list`, `plugin-data.js`)
 * intentionally reads and writes the RAW child config — layering applies at
 * load time only (config-loader + plugin install).
 */

const CHILD_CONFIG_PATHS = [
  path.join(process.cwd(), "quartz.config.yaml"),
  path.join(process.cwd(), "quartz.plugins.json"), // legacy
]
const DEFAULT_CONFIG_PATHS = [
  path.join(process.cwd(), "quartz.config.default.yaml"),
  path.join(process.cwd(), "quartz.plugins.default.json"), // legacy
]

/**
 * Normalize a plugin source for identity comparison across the two config
 * files, so "./plugins/toc-true-depth" and "plugins/toc-true-depth" (or a
 * legacy variant without the "./") are recognized as the same plugin.
 */
export function normalizedSourceKey(source: PluginSource): string {
  if (typeof source === "string") {
    return source.replace(/^\.\//, "")
  }
  return JSON.stringify(source)
}

/** Parse a config file (YAML or JSON by extension); null when it doesn't exist. */
export function parseConfigFile(filePath: string): QuartzPluginsJson | null {
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, "utf-8")
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    return YAML.parse(raw) as QuartzPluginsJson | null
  }
  return JSON.parse(raw) as QuartzPluginsJson
}

function mergeLayoutConfig(
  defaults: LayoutConfig | undefined,
  child: LayoutConfig | undefined,
): LayoutConfig | undefined {
  if (!defaults) return child
  if (!child) return defaults

  const merged: LayoutConfig = { ...defaults, ...child }

  if (defaults.groups || child.groups) {
    // Merge per group key AND per field within a group, so a child tweaking
    // one knob (e.g. toolbar priority) inherits the rest of the engine's
    // group definition.
    const groupKeys = new Set([
      ...Object.keys(defaults.groups ?? {}),
      ...Object.keys(child.groups ?? {}),
    ])
    merged.groups = {}
    for (const key of groupKeys) {
      merged.groups[key] = { ...defaults.groups?.[key], ...child.groups?.[key] }
    }
  }

  if (defaults.byPageType || child.byPageType) {
    const pageTypes = new Set([
      ...Object.keys(defaults.byPageType ?? {}),
      ...Object.keys(child.byPageType ?? {}),
    ])
    merged.byPageType = {}
    for (const pageType of pageTypes) {
      const d = defaults.byPageType?.[pageType] ?? {}
      const c = child.byPageType?.[pageType] ?? {}
      const m = { ...d, ...c }
      if (d.positions || c.positions) {
        m.positions = { ...d.positions, ...c.positions }
      }
      merged.byPageType[pageType] = m
    }
  }

  return merged
}

/**
 * Merge the engine default config beneath a site config
 * (replace-per-plugin — see module docblock).
 */
export function mergeQuartzConfigs(
  defaults: QuartzPluginsJson,
  child: QuartzPluginsJson,
): QuartzPluginsJson {
  // configuration: shallow merge, child wins per key
  const configuration = {
    ...(defaults.configuration ?? {}),
    ...(child.configuration ?? {}),
  }

  // plugins: child entries replace same-source default entries; unmentioned
  // defaults are inherited (kept first); child-only entries follow. Ordering
  // is irrelevant downstream — execution sorts by `order`, layout by
  // `priority`, and both sorts are stable.
  const childKeys = new Set((child.plugins ?? []).map((p) => normalizedSourceKey(p.source)))
  const inherited = (defaults.plugins ?? []).filter(
    (p) => !childKeys.has(normalizedSourceKey(p.source)),
  )
  const plugins = [...inherited, ...(child.plugins ?? [])]

  return {
    configuration,
    plugins,
    layout: mergeLayoutConfig(defaults.layout, child.layout),
  }
}

/**
 * The EFFECTIVE config: child file overlaid on the engine default file.
 * Returns the child alone when no default exists (standalone Quartz site),
 * the default alone when no child exists (engine self-host / `quartz create`
 * before scaffolding), and null when neither exists.
 */
export function readEffectivePluginsJson(): QuartzPluginsJson | null {
  const child =
    CHILD_CONFIG_PATHS.map(parseConfigFile).find((c): c is QuartzPluginsJson => c !== null) ?? null
  const deflt =
    DEFAULT_CONFIG_PATHS.map(parseConfigFile).find((c): c is QuartzPluginsJson => c !== null) ??
    null

  if (!child && !deflt) return null
  if (!child) return deflt
  if (!deflt) return child
  return mergeQuartzConfigs(deflt, child)
}
