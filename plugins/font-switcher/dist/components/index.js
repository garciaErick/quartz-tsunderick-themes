import {
  getFontRegistry,
  pathToRoot
} from "../chunk-I773FKEV.js";

// components/scripts/font-early.inline.ts
var font_early_inline_default = 'const STORAGE_KEY = "quartz-font";\nconst LINK_ID = "quartz-font-link";\nconst rawCatalog = "__FONT_SWITCHER_FONTS__";\nconst catalog = typeof rawCatalog === "object" && rawCatalog !== null ? rawCatalog : {};\nconst urlFont = new URLSearchParams(window.location.search).get("font");\nconst previewId = urlFont !== null && urlFont in catalog ? urlFont : null;\nconst id = previewId ?? localStorage.getItem(STORAGE_KEY);\nif (id && id !== "default" && id in catalog) {\n  document.documentElement.setAttribute("data-font-selected", id);\n  const baseHref = document.querySelector(\'link[rel="stylesheet"]:not([href^="http"]):not([href^="//"])\')?.getAttribute("href");\n  if (baseHref) {\n    const href = new URL(\n      `static/font-${encodeURIComponent(id)}.css`,\n      new URL(baseHref, document.baseURI)\n    ).href;\n    let link = document.getElementById(LINK_ID);\n    if (!link) {\n      link = document.createElement("link");\n      link.id = LINK_ID;\n      link.rel = "stylesheet";\n      link.setAttribute("data-persist", "");\n      document.head.appendChild(link);\n    }\n    link.href = href;\n  }\n}\n';

// components/scripts/font-switcher.inline.ts
var font_switcher_inline_default = 'const STORAGE_KEY = "quartz-font";\nconst LINK_ID = "quartz-font-link";\nfunction fontHref(id) {\n  const root = document.querySelector("[data-font-root]")?.getAttribute("data-font-root") ?? ".";\n  const prefix = root === "." ? "./" : `${root}/`;\n  return `${prefix}static/font-${encodeURIComponent(id)}.css`;\n}\nfunction setBakedDisabled(disabled) {\n  const baked = document.querySelector("link[data-baked-font]");\n  if (!baked) return;\n  if (disabled) baked.setAttribute("disabled", "");\n  else baked.removeAttribute("disabled");\n  if (baked instanceof HTMLLinkElement) baked.disabled = disabled;\n}\nfunction applyFont(id) {\n  localStorage.setItem(STORAGE_KEY, id);\n  setBakedDisabled(id !== "default");\n  const docEl = document.documentElement;\n  const existing = document.getElementById(LINK_ID);\n  if (id === "default") {\n    existing?.remove();\n    docEl.removeAttribute("data-font-selected");\n  } else {\n    let link = existing;\n    if (!link) {\n      link = document.createElement("link");\n      link.id = LINK_ID;\n      link.rel = "stylesheet";\n      link.setAttribute("data-persist", "");\n      document.head.appendChild(link);\n    }\n    link.href = fontHref(id);\n    docEl.setAttribute("data-font-selected", id);\n  }\n  reflectSelection();\n}\nfunction getMenu() {\n  const m = document.querySelector(".font-switcher-menu");\n  return m instanceof HTMLElement ? m : null;\n}\nfunction getToggle() {\n  const t = document.querySelector(".font-switcher-toggle");\n  return t instanceof HTMLElement ? t : null;\n}\nfunction isOpen() {\n  const m = getMenu();\n  return m !== null && !m.hasAttribute("hidden");\n}\nfunction openMenu() {\n  const m = getMenu();\n  const t = getToggle();\n  if (!m || !t) return;\n  m.removeAttribute("hidden");\n  m.style.display = "block";\n  t.setAttribute("aria-expanded", "true");\n  const current = m.querySelector(\'[aria-checked="true"]\') ?? m.querySelector(".font-switcher-option");\n  current?.focus();\n}\nfunction closeMenu(refocus) {\n  const m = getMenu();\n  const t = getToggle();\n  if (!m || !t) return;\n  m.setAttribute("hidden", "");\n  m.style.display = "none";\n  t.setAttribute("aria-expanded", "false");\n  if (refocus) t.focus();\n}\nfunction reflectSelection() {\n  const m = getMenu();\n  if (!m) return;\n  const preview = new URLSearchParams(window.location.search).get("font");\n  const active = preview ?? localStorage.getItem(STORAGE_KEY) ?? "default";\n  for (const el of m.querySelectorAll(".font-switcher-option")) {\n    el.setAttribute("aria-checked", el.getAttribute("data-font-id") === active ? "true" : "false");\n  }\n}\nfunction focusOption(from, dir) {\n  const m = getMenu();\n  if (!m) return;\n  const options = Array.from(m.querySelectorAll(".font-switcher-option")).filter(\n    (el) => el instanceof HTMLElement\n  );\n  if (options.length === 0) return;\n  const idx = from ? options.indexOf(from) : -1;\n  const next = options[(idx + dir + options.length * 2) % options.length];\n  next?.focus();\n}\nfunction onDocClick(e) {\n  const target = e.target instanceof Element ? e.target : null;\n  if (!target) return;\n  const option = target.closest(".font-switcher-option");\n  if (option) {\n    applyFont(option.getAttribute("data-font-id") ?? "default");\n    closeMenu(true);\n    return;\n  }\n  if (target.closest(".font-switcher-toggle")) {\n    if (isOpen()) closeMenu(false);\n    else {\n      reflectSelection();\n      openMenu();\n    }\n    return;\n  }\n  if (isOpen() && !target.closest(".font-switcher")) closeMenu(false);\n}\nfunction onDocKeydown(e) {\n  if (!isOpen()) return;\n  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;\n  if (e.key === "Escape") {\n    e.stopPropagation();\n    closeMenu(true);\n  } else if (e.key === "ArrowDown") {\n    e.preventDefault();\n    focusOption(active, 1);\n  } else if (e.key === "ArrowUp") {\n    e.preventDefault();\n    focusOption(active, -1);\n  }\n}\nlet wired = false;\nfunction wire() {\n  if (wired) return;\n  wired = true;\n  document.addEventListener("click", onDocClick, true);\n  document.addEventListener("keydown", onDocKeydown, true);\n  setBakedDisabled(document.documentElement.hasAttribute("data-font-selected"));\n  const count = document.querySelectorAll(".font-switcher-option").length;\n  console.log(`[font-switcher] ready (${count} fonts)`);\n}\nwire();\ndocument.addEventListener("nav", reflectSelection);\ndocument.addEventListener("render", reflectSelection);\n';

// components/styles/font-switcher.css
var font_switcher_default = `/* Font switcher toolbar button + popover menu.
   Colors come from the active theme's CSS variables so the popover
   automatically restyles under every theme. */

.font-switcher {
  position: relative;
  flex-shrink: 0;
}

.font-switcher-toggle {
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

.font-switcher-toggle svg {
  position: absolute;
  width: 20px;
  height: 20px;
  top: calc(50% - 10px);
  left: 0;
}

.font-switcher-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 100;
  min-width: 200px;
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
  .font-switcher-menu {
    left: auto;
    right: 0;
  }
}

.font-switcher-menu[hidden] {
  display: none;
}

.font-switcher-option {
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

.font-switcher-option:hover,
.font-switcher-option:focus-visible {
  background: var(--highlight);
  color: var(--dark);
  outline: none;
}

.font-switcher-option[aria-checked="true"] {
  color: var(--secondary);
  font-weight: 600;
}

.font-switcher-check {
  flex-shrink: 0;
  width: 1em;
  opacity: 0;
}

.font-switcher-option[aria-checked="true"] .font-switcher-check {
  opacity: 1;
}

.font-switcher-name {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;

// components/FontSwitcher.tsx
import { jsx, jsxs } from "preact/jsx-runtime";
var makeFontSwitcher = () => {
  const fonts = getFontRegistry();
  const catalog = {};
  for (const font of fonts) catalog[font.id] = font.label;
  const FontSwitcher = ({ fileData, displayClass }) => {
    if (fonts.length === 0) return null;
    const classes = ["font-switcher"];
    if (displayClass) classes.push(displayClass);
    return /* @__PURE__ */ jsxs("div", { class: classes.join(" "), "data-font-root": pathToRoot(fileData.slug), children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          class: "font-switcher-toggle",
          type: "button",
          "aria-haspopup": "true",
          "aria-expanded": "false",
          "aria-label": "Choose font",
          title: "Font",
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
                /* @__PURE__ */ jsx("polyline", { points: "4 7 4 4 20 4 20 7" }),
                /* @__PURE__ */ jsx("line", { x1: "9", x2: "15", y1: "20", y2: "20" }),
                /* @__PURE__ */ jsx("line", { x1: "12", x2: "12", y1: "4", y2: "20" })
              ]
            }
          )
        }
      ),
      /* @__PURE__ */ jsx("div", { class: "font-switcher-menu", role: "menu", "aria-label": "Fonts", hidden: true, children: fonts.map((font) => /* @__PURE__ */ jsxs(
        "button",
        {
          class: "font-switcher-option",
          role: "menuitemradio",
          "aria-checked": "false",
          "data-font-id": font.id,
          children: [
            /* @__PURE__ */ jsx("span", { class: "font-switcher-check", "aria-hidden": "true", children: "\u2713" }),
            /* @__PURE__ */ jsx(
              "span",
              {
                class: "font-switcher-name",
                style: font.stack ? `font-family: ${font.stack}` : void 0,
                children: font.label
              }
            )
          ]
        }
      )) })
    ] });
  };
  FontSwitcher.beforeDOMLoaded = font_early_inline_default.replace(
    '"__FONT_SWITCHER_FONTS__"',
    () => JSON.stringify(catalog)
  );
  FontSwitcher.afterDOMLoaded = font_switcher_inline_default;
  FontSwitcher.css = font_switcher_default;
  return FontSwitcher;
};
var FontSwitcher_default = (() => makeFontSwitcher());
export {
  FontSwitcher_default as FontSwitcher
};
