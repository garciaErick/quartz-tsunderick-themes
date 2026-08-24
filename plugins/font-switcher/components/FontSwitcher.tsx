import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { getFontRegistry, pathToRoot } from "../shared"
// @ts-expect-error imported as text via build.mjs inline-text loader
import earlyScript from "./scripts/font-early.inline.ts"
// @ts-expect-error imported as text via build.mjs inline-text loader
import behaviorScript from "./scripts/font-switcher.inline.ts"
// @ts-expect-error imported as text via build.mjs inline-text loader
import styles from "./styles/font-switcher.css"

/**
 * Built as a factory so the font catalog (id -> label) from the shared
 * registry — populated by the emitter half before layout assembly — can be
 * embedded into the early inline script. The catalog lets the early script
 * validate the persisted selection and the ?font= preview parameter
 * without waiting for the menu DOM.
 */
const makeFontSwitcher = (): QuartzComponent => {
  const fonts = getFontRegistry()
  const catalog: Record<string, string> = {}
  for (const font of fonts) catalog[font.id] = font.label

  const FontSwitcher: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
    if (fonts.length === 0) return null

    const classes = ["font-switcher"]
    if (displayClass) classes.push(displayClass)

    return (
      <div class={classes.join(" ")} data-font-root={pathToRoot(fileData.slug!)}>
        <button
          class="font-switcher-toggle"
          type="button"
          aria-haspopup="true"
          aria-expanded="false"
          aria-label="Choose font"
          title="Font"
        >
          {/* lucide "type" icon */}
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
            <polyline points="4 7 4 4 20 4 20 7"></polyline>
            <line x1="9" x2="15" y1="20" y2="20"></line>
            <line x1="12" x2="12" y1="4" y2="20"></line>
          </svg>
        </button>
        <div class="font-switcher-menu" role="menu" aria-label="Fonts" hidden>
          {fonts.map((font) => (
            <button
              class="font-switcher-option"
              role="menuitemradio"
              aria-checked="false"
              data-font-id={font.id}
            >
              <span class="font-switcher-check" aria-hidden="true">
                ✓
              </span>
              {/* preview each option in its own typeface (family declared in
                  font-faces.css, fetched only when rendered) */}
              <span
                class="font-switcher-name"
                style={font.stack ? `font-family: ${font.stack}` : undefined}
              >
                {font.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Replacer function: replacement text must never be interpreted for $ patterns
  FontSwitcher.beforeDOMLoaded = (earlyScript as string).replace('"__FONT_SWITCHER_FONTS__"', () =>
    JSON.stringify(catalog),
  )
  FontSwitcher.afterDOMLoaded = behaviorScript as string
  FontSwitcher.css = styles as string

  return FontSwitcher
}

export default (() => makeFontSwitcher()) satisfies QuartzComponentConstructor
