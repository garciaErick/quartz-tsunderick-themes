import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { getThemeRegistry, pathToRoot } from "../shared"
// @ts-expect-error imported as text via build.mjs inline-text loader
import earlyScript from "./scripts/theme-early.inline.ts"
// @ts-expect-error imported as text via build.mjs inline-text loader
import behaviorScript from "./scripts/theme-switcher.inline.ts"
// @ts-expect-error imported as text via build.mjs inline-text loader
import styles from "./styles/theme-switcher.css"

/**
 * Built as a factory so the theme catalog (id -> modes) from the shared
 * registry — populated by the emitter half before layout assembly — can be
 * embedded into the early inline script. The catalog lets the early script
 * force light/dark for single-mode themes (including ?theme= previews)
 * without waiting for the menu DOM.
 */
const makeThemeSwitcher = (): QuartzComponent => {
  const themes = getThemeRegistry()
  const catalog: Record<string, string> = {}
  for (const theme of themes) catalog[theme.id] = theme.modes

  const ThemeSwitcher: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    if (themes.length === 0) return null

    const classes = ["theme-switcher"]
    if (displayClass) classes.push(displayClass)

    return (
      <div class={classes.join(" ")} data-theme-root={pathToRoot(fileData.slug!)}>
        <button
          class="theme-switcher-toggle"
          type="button"
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="Choose theme"
          title="Theme"
        >
          {/* lucide "palette" icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"></path>
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" stroke="none"></circle>
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" stroke="none"></circle>
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" stroke="none"></circle>
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" stroke="none"></circle>
          </svg>
        </button>
        <div class="theme-switcher-menu" role="menu" aria-label="Themes" hidden>
          {themes.map((theme) => (
            <button
              class="theme-switcher-option"
              role="menuitemradio"
              aria-checked="false"
              data-theme-id={theme.id}
              data-theme-modes={theme.modes}
            >
              <span class="theme-switcher-check" aria-hidden="true">
                ✓
              </span>
              <span class="theme-switcher-name">{theme.label}</span>
              {theme.modes !== "both" && (
                <span class={`theme-switcher-badge theme-switcher-badge-${theme.modes}`}>
                  {theme.modes}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Replacer function: replacement text must never be interpreted for $ patterns
  ThemeSwitcher.beforeDOMLoaded = (earlyScript as string).replace(
    '"__THEME_SWITCHER_THEMES__"',
    () => JSON.stringify(catalog),
  )
  ThemeSwitcher.afterDOMLoaded = behaviorScript as string
  ThemeSwitcher.css = styles as string

  return ThemeSwitcher
}

export default (() => makeThemeSwitcher()) satisfies QuartzComponentConstructor
