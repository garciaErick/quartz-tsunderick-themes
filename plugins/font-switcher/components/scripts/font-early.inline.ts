// Font switcher — early (beforeDOMReady) script.
// Runs synchronously in <head> before first paint:
//  1. applies the ?font=<id> URL preview parameter if present and valid
//     (non-persistent: nothing is written to localStorage),
//  2. otherwise applies the persisted selection from localStorage,
//  3. injects the selected font's stylesheet (resolved against an existing
//     page stylesheet so it works under any base path),
//  4. marks <html data-font-selected>, which neutralizes the guarded baked
//     font css via its html:not([data-font-selected]) scope.
//
// `export {}` makes this a module for strict tsc; build.mjs strips it from
// the emitted inline text (same technique as Quartz's inline-script-loader).
export {}

const STORAGE_KEY = "quartz-font"
const LINK_ID = "quartz-font-link"

// Replaced at component-construction time with {"<id>":"<label>",...}.
// Unreplaced (registry empty) degrades to an empty catalog.
const rawCatalog: unknown = "__FONT_SWITCHER_FONTS__"
const catalog: Record<string, string> =
  typeof rawCatalog === "object" && rawCatalog !== null
    ? (rawCatalog as Record<string, string>)
    : {}

const urlFont = new URLSearchParams(window.location.search).get("font")
const previewId = urlFont !== null && urlFont in catalog ? urlFont : null
const id = previewId ?? localStorage.getItem(STORAGE_KEY)

if (id && id !== "default" && id in catalog) {
  document.documentElement.setAttribute("data-font-selected", id)

  // Resolve against the first RELATIVE stylesheet link (the page's own
  // index css). The first <link> overall can be an absolute font URL —
  // resolving against it would 404 the font file.
  const baseHref = document
    .querySelector('link[rel="stylesheet"]:not([href^="http"]):not([href^="//"])')
    ?.getAttribute("href")
  if (baseHref) {
    const href = new URL(
      `static/font-${encodeURIComponent(id)}.css`,
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
}
