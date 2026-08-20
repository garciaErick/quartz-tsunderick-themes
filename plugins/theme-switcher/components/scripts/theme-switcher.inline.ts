// Theme switcher — behavior (afterDOMReady) script.
//
// Wiring strategy: a SINGLE document-level click listener in the CAPTURE
// phase, attached exactly once, using event delegation. This is immune to:
//  - duplicate attachment (older versions re-ran setup on every nav+render
//    event, so each click fired the handler twice: open+close = nothing)
//  - SPA body morphs (delegation always resolves against current DOM)
//  - other components' stopPropagation (capture at document runs first)
//
// `export {}` makes this a module for strict tsc; build.mjs strips it from
// the emitted inline text (same technique as Quartz's inline-script-loader).
export {}

const STORAGE_KEY = "quartz-theme"
const LINK_ID = "quartz-theme-link"
type ForcedMode = "dark" | "light"

function themeHref(id: string): string {
  const root = document.querySelector("[data-theme-root]")?.getAttribute("data-theme-root") ?? "."
  const prefix = root === "." ? "./" : `${root}/`
  return `${prefix}static/theme-${encodeURIComponent(id)}.css`
}

function emitThemeChangeEvent(theme: ForcedMode): void {
  document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }))
}

/**
 * Disable/enable the baked default theme link. The guard selectors already
 * neutralize it via html:not([data-theme-selected]); disabling additionally
 * skips style computation entirely (and survives any selector edge case).
 */
function setBakedDisabled(disabled: boolean): void {
  const baked = document.querySelector("link[data-baked-theme]")
  if (!baked) return
  if (disabled) baked.setAttribute("disabled", "")
  else baked.removeAttribute("disabled")
  if (baked instanceof HTMLLinkElement) baked.disabled = disabled
}

function applyTheme(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
  setBakedDisabled(id !== "default")

  const docEl = document.documentElement
  const existing = document.getElementById(LINK_ID)

  if (id === "default") {
    existing?.remove()
    docEl.removeAttribute("data-theme-selected")
  } else {
    let link = existing as HTMLLinkElement | null
    if (!link) {
      link = document.createElement("link")
      link.id = LINK_ID
      link.rel = "stylesheet"
      link.setAttribute("data-persist", "")
      document.head.appendChild(link)
    }
    link.href = themeHref(id)
    docEl.setAttribute("data-theme-selected", id)

    // Force light/dark for single-mode themes (mirrors what
    // @quartz-themes/core does for build-time single-mode themes).
    const modes = document
      .querySelector(`.theme-switcher-option[data-theme-id="${id}"]`)
      ?.getAttribute("data-theme-modes")
    if (modes === "dark" || modes === "light") {
      const forced: ForcedMode = modes
      docEl.setAttribute("saved-theme", forced)
      localStorage.setItem("theme", forced)
      document.body?.classList.remove("theme-dark", "theme-light")
      document.body?.classList.add(`theme-${forced}`)
      emitThemeChangeEvent(forced)
    }
  }

  reflectSelection()
}

// ---------------------------------------------------------------------------
// Popover state helpers (always resolve against the CURRENT DOM)
// ---------------------------------------------------------------------------

function getMenu(): HTMLElement | null {
  const m = document.querySelector(".theme-switcher-menu")
  return m instanceof HTMLElement ? m : null
}

function getToggle(): HTMLElement | null {
  const t = document.querySelector(".theme-switcher-toggle")
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
    (m.querySelector(".theme-switcher-option") as HTMLElement | null)
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
  const preview = new URLSearchParams(window.location.search).get("theme")
  const active = preview ?? localStorage.getItem(STORAGE_KEY) ?? "default"
  for (const el of m.querySelectorAll(".theme-switcher-option")) {
    el.setAttribute("aria-checked", el.getAttribute("data-theme-id") === active ? "true" : "false")
  }
}

function focusOption(from: HTMLElement | null, dir: 1 | -1): void {
  const m = getMenu()
  if (!m) return
  const options = Array.from(m.querySelectorAll(".theme-switcher-option")).filter(
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

  const option = target.closest(".theme-switcher-option")
  if (option) {
    applyTheme(option.getAttribute("data-theme-id") ?? "default")
    closeMenu(true)
    return
  }

  if (target.closest(".theme-switcher-toggle")) {
    if (isOpen()) closeMenu(false)
    else {
      reflectSelection()
      openMenu()
    }
    return
  }

  // click outside an open menu closes it
  if (isOpen() && !target.closest(".theme-switcher")) closeMenu(false)
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
  // attribute (guards neutralize the baked css); disable the link for real
  setBakedDisabled(document.documentElement.hasAttribute("data-theme-selected"))
  const count = document.querySelectorAll(".theme-switcher-option").length
  console.log(`[theme-switcher] ready (${count} themes)`)
}
wire()

// Refresh the checkmark after SPA navigations/re-renders. Idempotent
// attribute writes only — no listener churn, safe any number of times.
document.addEventListener("nav", reflectSelection)
document.addEventListener("render", reflectSelection)
