/**
 * Shared font registry for the font-switcher plugin.
 *
 * The emitter half and the component half are bundled as separate entry
 * points (dist/index.js and dist/components/index.js). To guarantee both
 * halves observe the same state even if module duplication ever occurs,
 * the registry is backed by globalThis.
 */

export interface SwitchableFont {
  /** Stable id used in URLs, localStorage and the emitted file name. */
  id: string
  /** Human-readable label shown in the dropdown. */
  label: string
  /** Emitted file (relative to site root), or null for the baked-in default. */
  file: string | null
  /**
   * CSS font-family stack for this font (used by the dropdown to preview
   * each option in its own typeface), or null when unknown.
   */
  stack: string | null
}

const REGISTRY_KEY = "__quartzFontSwitcherFonts"

export function setFontRegistry(fonts: SwitchableFont[]): void {
  ;(globalThis as Record<string, unknown>)[REGISTRY_KEY] = fonts
}

export function getFontRegistry(): SwitchableFont[] {
  return ((globalThis as Record<string, unknown>)[REGISTRY_KEY] as SwitchableFont[]) ?? []
}

/** Matches @quartz-community/utils pathToRoot ("index" -> ".", "a/b" -> ".."). */
export function pathToRoot(slug: string): string {
  const ups = slug.split("/").length - 1
  return ups === 0 ? "." : "../".repeat(ups)
}
