/**
 * Shared theme registry for the theme-switcher plugin.
 *
 * The emitter half and the component half are bundled as separate entry
 * points (dist/index.js and dist/components/index.js). To guarantee both
 * halves observe the same state even if module duplication ever occurs,
 * the registry is backed by globalThis.
 */

export type ThemeModes = "both" | "dark" | "light"

export interface SwitchableTheme {
  /** Stable id used in URLs, localStorage and the emitted file name. */
  id: string
  /** Human-readable label shown in the dropdown. */
  label: string
  /** Which light/dark modes this theme supports. */
  modes: ThemeModes
  /** Emitted file (relative to site root), or null for the baked-in default. */
  file: string | null
}

const REGISTRY_KEY = "__quartzThemeSwitcherThemes"

export function setThemeRegistry(themes: SwitchableTheme[]): void {
  ;(globalThis as Record<string, unknown>)[REGISTRY_KEY] = themes
}

export function getThemeRegistry(): SwitchableTheme[] {
  return ((globalThis as Record<string, unknown>)[REGISTRY_KEY] as SwitchableTheme[]) ?? []
}
