import {
  getThemeRegistry,
  pathToRoot
} from "../chunk-J5F6RGHR.js";

// components/scripts/theme-early.inline.ts
var theme_early_inline_default = 'const STORAGE_KEY = "quartz-theme";\nconst LINK_ID = "quartz-theme-link";\nconst rawCatalog = "__THEME_SWITCHER_THEMES__";\nconst catalog = typeof rawCatalog === "object" && rawCatalog !== null ? rawCatalog : {};\nconst urlTheme = new URLSearchParams(window.location.search).get("theme");\nconst previewId = urlTheme !== null && urlTheme in catalog ? urlTheme : null;\nconst id = previewId ?? localStorage.getItem(STORAGE_KEY);\nif (id && id !== "default" && id in catalog) {\n  document.documentElement.setAttribute("data-theme-selected", id);\n  const baseHref = document.querySelector(\'link[rel="stylesheet"]:not([href^="http"]):not([href^="//"])\')?.getAttribute("href");\n  if (baseHref) {\n    const href = new URL(\n      `static/theme-${encodeURIComponent(id)}.css`,\n      new URL(baseHref, document.baseURI)\n    ).href;\n    let link = document.getElementById(LINK_ID);\n    if (!link) {\n      link = document.createElement("link");\n      link.id = LINK_ID;\n      link.rel = "stylesheet";\n      link.setAttribute("data-persist", "");\n      document.head.appendChild(link);\n    }\n    link.href = href;\n  }\n  const mode = catalog[id];\n  if (mode === "dark" || mode === "light") {\n    document.documentElement.setAttribute("saved-theme", mode);\n    if (!previewId) {\n      localStorage.setItem("theme", mode);\n    }\n  }\n}\n';

// components/scripts/theme-switcher.inline.ts
var theme_switcher_inline_default = 'const STORAGE_KEY = "quartz-theme";\nconst LINK_ID = "quartz-theme-link";\nfunction themeHref(id) {\n  const root = document.querySelector("[data-theme-root]")?.getAttribute("data-theme-root") ?? ".";\n  const prefix = root === "." ? "./" : `${root}/`;\n  return `${prefix}static/theme-${encodeURIComponent(id)}.css`;\n}\nfunction emitThemeChangeEvent(theme) {\n  document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));\n}\nfunction setBakedDisabled(disabled) {\n  const baked = document.querySelector("link[data-baked-theme]");\n  if (!baked) return;\n  if (disabled) baked.setAttribute("disabled", "");\n  else baked.removeAttribute("disabled");\n  if (baked instanceof HTMLLinkElement) baked.disabled = disabled;\n}\nfunction applyTheme(id) {\n  localStorage.setItem(STORAGE_KEY, id);\n  setBakedDisabled(id !== "default");\n  const docEl = document.documentElement;\n  const existing = document.getElementById(LINK_ID);\n  if (id === "default") {\n    existing?.remove();\n    docEl.removeAttribute("data-theme-selected");\n  } else {\n    let link = existing;\n    if (!link) {\n      link = document.createElement("link");\n      link.id = LINK_ID;\n      link.rel = "stylesheet";\n      link.setAttribute("data-persist", "");\n      document.head.appendChild(link);\n    }\n    link.href = themeHref(id);\n    docEl.setAttribute("data-theme-selected", id);\n    const modes = document.querySelector(`.theme-switcher-option[data-theme-id="${id}"]`)?.getAttribute("data-theme-modes");\n    if (modes === "dark" || modes === "light") {\n      const forced = modes;\n      docEl.setAttribute("saved-theme", forced);\n      localStorage.setItem("theme", forced);\n      document.body?.classList.remove("theme-dark", "theme-light");\n      document.body?.classList.add(`theme-${forced}`);\n      emitThemeChangeEvent(forced);\n    }\n  }\n  reflectSelection();\n}\nfunction getMenu() {\n  const m = document.querySelector(".theme-switcher-menu");\n  return m instanceof HTMLElement ? m : null;\n}\nfunction getToggle() {\n  const t = document.querySelector(".theme-switcher-toggle");\n  return t instanceof HTMLElement ? t : null;\n}\nfunction isOpen() {\n  const m = getMenu();\n  return m !== null && !m.hasAttribute("hidden");\n}\nfunction openMenu() {\n  const m = getMenu();\n  const t = getToggle();\n  if (!m || !t) return;\n  m.removeAttribute("hidden");\n  m.style.display = "block";\n  t.setAttribute("aria-expanded", "true");\n  const current = m.querySelector(\'[aria-checked="true"]\') ?? m.querySelector(".theme-switcher-option");\n  current?.focus();\n}\nfunction closeMenu(refocus) {\n  const m = getMenu();\n  const t = getToggle();\n  if (!m || !t) return;\n  m.setAttribute("hidden", "");\n  m.style.display = "none";\n  t.setAttribute("aria-expanded", "false");\n  if (refocus) t.focus();\n}\nfunction reflectSelection() {\n  const m = getMenu();\n  if (!m) return;\n  const preview = new URLSearchParams(window.location.search).get("theme");\n  const active = preview ?? localStorage.getItem(STORAGE_KEY) ?? "default";\n  for (const el of m.querySelectorAll(".theme-switcher-option")) {\n    el.setAttribute("aria-checked", el.getAttribute("data-theme-id") === active ? "true" : "false");\n  }\n}\nfunction focusOption(from, dir) {\n  const m = getMenu();\n  if (!m) return;\n  const options = Array.from(m.querySelectorAll(".theme-switcher-option")).filter(\n    (el) => el instanceof HTMLElement\n  );\n  if (options.length === 0) return;\n  const idx = from ? options.indexOf(from) : -1;\n  const next = options[(idx + dir + options.length * 2) % options.length];\n  next?.focus();\n}\nfunction onDocClick(e) {\n  const target = e.target instanceof Element ? e.target : null;\n  if (!target) return;\n  const option = target.closest(".theme-switcher-option");\n  if (option) {\n    applyTheme(option.getAttribute("data-theme-id") ?? "default");\n    closeMenu(true);\n    return;\n  }\n  if (target.closest(".theme-switcher-toggle")) {\n    if (isOpen()) closeMenu(false);\n    else {\n      reflectSelection();\n      openMenu();\n    }\n    return;\n  }\n  if (isOpen() && !target.closest(".theme-switcher")) closeMenu(false);\n}\nfunction onDocKeydown(e) {\n  if (!isOpen()) return;\n  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;\n  if (e.key === "Escape") {\n    e.stopPropagation();\n    closeMenu(true);\n  } else if (e.key === "ArrowDown") {\n    e.preventDefault();\n    focusOption(active, 1);\n  } else if (e.key === "ArrowUp") {\n    e.preventDefault();\n    focusOption(active, -1);\n  }\n}\nlet wired = false;\nfunction wire() {\n  if (wired) return;\n  wired = true;\n  document.addEventListener("click", onDocClick, true);\n  document.addEventListener("keydown", onDocKeydown, true);\n  setBakedDisabled(document.documentElement.hasAttribute("data-theme-selected"));\n  const count = document.querySelectorAll(".theme-switcher-option").length;\n  console.log(`[theme-switcher] ready (${count} themes)`);\n}\nwire();\ndocument.addEventListener("nav", reflectSelection);\ndocument.addEventListener("render", reflectSelection);\n';

// components/styles/theme-switcher.css
var theme_switcher_default = `/* Theme switcher toolbar button + popover menu.
   Colors come from the active theme's CSS variables so the popover
   automatically restyles under every theme, including single-mode ones. */

.theme-switcher {
  position: relative;
  flex-shrink: 0;
}

.theme-switcher-toggle {
  cursor: pointer;
  padding: 0;
  background: none;
  border: none;
  width: 20px;
  height: 32px;
  margin: 0;
  position: relative;
  text-align: inherit;
  flex-shrink: 0;
  color: var(--darkgray);
}

.theme-switcher-toggle svg {
  position: absolute;
  width: 20px;
  height: 20px;
  top: calc(50% - 10px);
  left: 0;
}

.theme-switcher-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 100;
  min-width: 220px;
  max-width: 300px;
  max-height: min(60vh, 480px);
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0;
  padding: 6px;
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}

/* On narrow/mobile viewports the toolbar lives in a centered top row;
   anchor the menu to the container's right edge so it grows leftward
   instead of overflowing the viewport. Matches variables.scss $mobile. */
@media (max-width: 800px) {
  .theme-switcher-menu {
    left: auto;
    right: 0;
  }
}

.theme-switcher-menu[hidden] {
  display: none;
}

.theme-switcher-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 6px 10px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--darkgray);
  font-family: inherit;
  font-size: 0.95em;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}

.theme-switcher-option:hover,
.theme-switcher-option:focus-visible {
  background: var(--highlight);
  color: var(--dark);
  outline: none;
}

.theme-switcher-option[aria-checked="true"] {
  color: var(--secondary);
  font-weight: 600;
}

.theme-switcher-check {
  flex-shrink: 0;
  width: 1em;
  opacity: 0;
}

.theme-switcher-option[aria-checked="true"] .theme-switcher-check {
  opacity: 1;
}

.theme-switcher-name {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-switcher-badge {
  flex-shrink: 0;
  font-size: 0.68em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid var(--lightgray);
  color: var(--gray);
}
`;

// components/ThemeSwitcher.tsx
import { jsx, jsxs } from "preact/jsx-runtime";
var makeThemeSwitcher = () => {
  const themes = getThemeRegistry();
  const catalog = {};
  for (const theme of themes) catalog[theme.id] = theme.modes;
  const ThemeSwitcher = ({ fileData, displayClass }) => {
    if (themes.length === 0) return null;
    const classes = ["theme-switcher"];
    if (displayClass) classes.push(displayClass);
    return /* @__PURE__ */ jsxs("div", { class: classes.join(" "), "data-theme-root": pathToRoot(fileData.slug), children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          class: "theme-switcher-toggle",
          type: "button",
          "aria-haspopup": "true",
          "aria-expanded": "false",
          "aria-label": "Choose theme",
          title: "Theme",
          children: /* @__PURE__ */ jsxs(
            "svg",
            {
              xmlns: "http://www.w3.org/2000/svg",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              "stroke-width": "2",
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              "aria-hidden": "true",
              children: [
                /* @__PURE__ */ jsx("path", { d: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" }),
                /* @__PURE__ */ jsx("circle", { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor", stroke: "none" }),
                /* @__PURE__ */ jsx("circle", { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor", stroke: "none" }),
                /* @__PURE__ */ jsx("circle", { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor", stroke: "none" }),
                /* @__PURE__ */ jsx("circle", { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor", stroke: "none" })
              ]
            }
          )
        }
      ),
      /* @__PURE__ */ jsx("div", { class: "theme-switcher-menu", role: "menu", "aria-label": "Themes", hidden: true, children: themes.map((theme) => /* @__PURE__ */ jsxs(
        "button",
        {
          class: "theme-switcher-option",
          role: "menuitemradio",
          "aria-checked": "false",
          "data-theme-id": theme.id,
          "data-theme-modes": theme.modes,
          children: [
            /* @__PURE__ */ jsx("span", { class: "theme-switcher-check", "aria-hidden": "true", children: "\u2713" }),
            /* @__PURE__ */ jsx("span", { class: "theme-switcher-name", children: theme.label }),
            theme.modes !== "both" && /* @__PURE__ */ jsx("span", { class: `theme-switcher-badge theme-switcher-badge-${theme.modes}`, children: theme.modes })
          ]
        }
      )) })
    ] });
  };
  ThemeSwitcher.beforeDOMLoaded = theme_early_inline_default.replace(
    '"__THEME_SWITCHER_THEMES__"',
    () => JSON.stringify(catalog)
  );
  ThemeSwitcher.afterDOMLoaded = theme_switcher_inline_default;
  ThemeSwitcher.css = theme_switcher_default;
  return ThemeSwitcher;
};
var ThemeSwitcher_default = (() => makeThemeSwitcher());
export {
  ThemeSwitcher_default as ThemeSwitcher
};
