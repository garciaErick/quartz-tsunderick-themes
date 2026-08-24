// Font switcher — behavior (afterDOMReady) script.
//
// Wiring strategy mirrors the theme switcher: a SINGLE document-level click
// listener in the CAPTURE phase, attached exactly once, using event
// delegation. This is immune to:
//  - duplicate attachment (re-running setup on every nav+render event)
//  - SPA body morphs (delegation always resolves against current DOM)
//  - other components' stopPropagation (capture at document runs first)
//
// `export {}` makes this a module for strict tsc; build.mjs strips it from
// the emitted inline text (same technique as Quartz's inline-script-loader).
export {}

const STORAGE_KEY = "quartz-font"
const LINK_ID = "quartz-font-link"

function fontHref(id: string): string {
  const root = document.querySelector("[data-font-root]")?.getAttribute("data-font-root") ?? "."
  const prefix = root === "." ? "./" : `${root}/`
  return `${prefix}static/font-${encodeURIComponent(id)}.css`
}

/**
 * NOTE: the baked default font link (link[data-baked-font]) is NEVER
 * disabled here. Both font states are expressed purely through the
 * html[data-font-selected] attribute and the guard selectors in the
 * emitted css (html:not([data-font-selected]) vs html[data-font-selected],
 * both specificity (0,1,1)) — attribute presence alone decides which sheet
 * applies. This deliberately avoids the CSSOM link.disabled round-trip,
 * whose re-enable behavior is engine-quirk territory (sheets staying dead
 * after repeated disable/enable cycles), and the (0,1,1) selectors cannot
 * lose a specificity tie no matter how the SPA head morph reshuffles links.
 */
function applyFont(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
  syncDom(id)
  reflectSelection()
}

/** Idempotently bring the DOM (attribute + runtime link) in line with `id`. */
function syncDom(id: string): void {
  const docEl = document.documentElement
  const existing = document.getElementById(LINK_ID)

  if (id === "default") {
    existing?.remove()
    docEl.removeAttribute("data-font-selected")
  } else {
    let link = existing as HTMLLinkElement | null
    if (!link) {
      link = document.createElement("link")
      link.id = LINK_ID
      link.rel = "stylesheet"
      link.setAttribute("data-persist", "")
      document.head.appendChild(link)
    }
    const href = fontHref(id)
    if (link.getAttribute("href") !== href) link.href = href
    docEl.setAttribute("data-font-selected", id)
  }
}

/**
 * Re-assert the persisted selection after SPA navigations/re-renders.
 * The head morph preserves data-persist links, but a defensive reconcile
 * heals any drift (missing link, stale attribute) without listener churn.
 * Mirrors the early script's resolution: ?font= preview wins when it names
 * a real option, else localStorage, else default; anything stale (a font
 * since removed from the config, a bogus preview param) falls back to
 * default rather than neutralizing the baked sheet with a 404.
 */
function reconcile(): void {
  const valid = new Set(
    Array.from(document.querySelectorAll(".font-switcher-option[data-font-id]")).map((el) =>
      el.getAttribute("data-font-id"),
    ),
  )
  if (valid.size === 0) return // menu not rendered yet; early script owns this load

  const preview = new URLSearchParams(window.location.search).get("font")
  const stored = localStorage.getItem(STORAGE_KEY)
  let desired = preview !== null && valid.has(preview) ? preview : (stored ?? "default")
  if (desired !== "default" && !valid.has(desired)) desired = "default"
  syncDom(desired)
}

// ---------------------------------------------------------------------------
// Popover state helpers (always resolve against the CURRENT DOM)
// ---------------------------------------------------------------------------

function getMenu(): HTMLElement | null {
  const m = document.querySelector(".font-switcher-menu")
  return m instanceof HTMLElement ? m : null
}

function getToggle(): HTMLElement | null {
  const t = document.querySelector(".font-switcher-toggle")
  return t instanceof HTMLElement ? t : null
}

function isOpen(): boolean {
  const m = getMenu()
  return m !== null && !m.hasAttribute("hidden")
}

function openMenu(): void {
  const m = getMenu()
  const t = getToggle()
  if (!m || !t) return
  m.removeAttribute("hidden")
  m.style.display = "block" // belt & suspenders: independent of stylesheet load
  t.setAttribute("aria-expanded", "true")
  const current =
    (m.querySelector('[aria-checked="true"]') as HTMLElement | null) ??
    (m.querySelector(".font-switcher-option") as HTMLElement | null)
  current?.focus()
}

function closeMenu(refocus: boolean): void {
  const m = getMenu()
  const t = getToggle()
  if (!m || !t) return
  m.setAttribute("hidden", "")
  m.style.display = "none"
  t.setAttribute("aria-expanded", "false")
  if (refocus) t.focus()
}

/** Reflect the active selection in the menu (idempotent, safe to call often). */
function reflectSelection(): void {
  const m = getMenu()
  if (!m) return
  const preview = new URLSearchParams(window.location.search).get("font")
  const active = preview ?? localStorage.getItem(STORAGE_KEY) ?? "default"
  for (const el of m.querySelectorAll(".font-switcher-option")) {
    el.setAttribute("aria-checked", el.getAttribute("data-font-id") === active ? "true" : "false")
  }
}

function focusOption(from: HTMLElement | null, dir: 1 | -1): void {
  const m = getMenu()
  if (!m) return
  const options = Array.from(m.querySelectorAll(".font-switcher-option")).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  )
  if (options.length === 0) return
  const idx = from ? options.indexOf(from) : -1
  const next = options[(idx + dir + options.length * 2) % options.length]
  next?.focus()
}

// ---------------------------------------------------------------------------
// One-time document-level wiring (event delegation, capture phase)
// ---------------------------------------------------------------------------

function onDocClick(e: Event): void {
  const target = e.target instanceof Element ? e.target : null
  if (!target) return

  const option = target.closest(".font-switcher-option")
  if (option) {
    applyFont(option.getAttribute("data-font-id") ?? "default")
    closeMenu(true)
    return
  }

  if (target.closest(".font-switcher-toggle")) {
    if (isOpen()) closeMenu(false)
    else {
      reflectSelection()
      openMenu()
    }
    return
  }

  // click outside an open menu closes it
  if (isOpen() && !target.closest(".font-switcher")) closeMenu(false)
}

function onDocKeydown(e: KeyboardEvent): void {
  if (!isOpen()) return
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
  if (e.key === "Escape") {
    e.stopPropagation()
    closeMenu(true)
  } else if (e.key === "ArrowDown") {
    e.preventDefault()
    focusOption(active, 1)
  } else if (e.key === "ArrowUp") {
    e.preventDefault()
    focusOption(active, -1)
  }
}

let wired = false
function wire(): void {
  if (wired) return
  wired = true
  document.addEventListener("click", onDocClick, true)
  document.addEventListener("keydown", onDocKeydown, true)
  // cold load with a stored selection: the early script already set the
  // attribute + runtime link pre-paint; the guard selectors in the emitted
  // css make attribute presence alone decide which sheet applies
  reconcile()
  const count = document.querySelectorAll(".font-switcher-option").length
  console.log(`[font-switcher] ready (${count} fonts)`)
}
wire()

// Re-assert the selection after SPA navigations/re-renders, and refresh
// the menu checkmark. Both are idempotent attribute writes only — no
// listener churn, safe any number of times.
document.addEventListener("nav", reconcile)
document.addEventListener("nav", reflectSelection)
document.addEventListener("render", reconcile)
document.addEventListener("render", reflectSelection)
