// Theme switcher — early (beforeDOMReady) script.
// Runs synchronously in <head> before first paint:
//  1. applies the ?theme=<id> URL preview parameter if present and valid
//     (non-persistent: nothing is written to localStorage),
//  2. otherwise applies the persisted selection from localStorage,
//  3. injects the selected theme's stylesheet (resolved against an existing
//     page stylesheet so it works under any base path),
//  4. marks <html data-theme-selected> (scopes the mermaid --tertiary pin
//     in custom.scss away from selected themes),
//  5. forces light/dark for single-mode themes based on the embedded catalog.
//
// Script order note: this script is registered after @quartz-community/darkmode's
// cold-load script (component-only plugins register during config pass 1, our
// component during emitter instantiation), so our saved-theme assignment is the
// final word in prescript.js.
//
// `export {}` makes this a module for strict tsc; build.mjs strips it from
// the emitted inline text (same technique as Quartz's inline-script-loader).
export {}

const STORAGE_KEY = "quartz-theme"
const LINK_ID = "quartz-theme-link"

// Replaced at component-construction time with {"<id>":"both"|"dark"|"light",...}.
// Unreplaced (registry empty) degrades to an empty catalog.
const rawCatalog: unknown = "__THEME_SWITCHER_THEMES__"
const catalog: Record<string, string> =
  typeof rawCatalog === "object" && rawCatalog !== null
    ? (rawCatalog as Record<string, string>)
    : {}

const urlTheme = new URLSearchParams(window.location.search).get("theme")
const previewId = urlTheme !== null && urlTheme in catalog ? urlTheme : null
const id = previewId ?? localStorage.getItem(STORAGE_KEY)

if (id && id !== "default" && id in catalog) {
  document.documentElement.setAttribute("data-theme-selected", id)

  const baseHref = document.querySelector('link[rel="stylesheet"]')?.getAttribute("href")
  if (baseHref) {
    const href = new URL(
      `static/theme-${encodeURIComponent(id)}.css`,
      new URL(baseHref, document.baseURI),
    ).href
    let link = document.getElementById(LINK_ID) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement("link")
      link.id = LINK_ID
      link.rel = "stylesheet"
      link.setAttribute("data-persist", "")
      document.head.appendChild(link)
    }
    link.href = href
  }

  const mode = catalog[id]
  if (mode === "dark" || mode === "light") {
    document.documentElement.setAttribute("saved-theme", mode)
    // Persist the forced mode only for persisted selections (mirrors what
    // @quartz-themes/core does for build-time single-mode themes); URL
    // previews stay side-effect free.
    if (!previewId) {
      localStorage.setItem("theme", mode)
    }
  }
}
