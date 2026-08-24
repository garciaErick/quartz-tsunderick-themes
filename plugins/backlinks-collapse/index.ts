/**
 * Backlinks (Collapsible) — wraps @quartz-community/backlinks.
 *
 * Upstream renders the section as a bare <h3> + overflow list with no way
 * to fold it away. This wrapper keeps upstream's rendering intact — i18n
 * titles, hideWhenEmpty, the overflow gradient observer, list ids — and
 * only rewrites the rendered vdom's <h3> into a <button.backlinks-header>
 * carrying the same h3 plus a chevron, mirroring the TOC plugin's collapse
 * pattern exactly (button gets .collapsed, next sibling ul gets .collapsed,
 * aria-expanded flips).
 *
 * The structural assumption is minimal: the rendered root is a div whose
 * children include an h3 and a ul. If upstream ever changes shape, the
 * rewrite is skipped and stock (non-collapsible) backlinks render — never
 * a crash.
 */

import { h } from "preact"
import { Backlinks as UpstreamBacklinks } from "@quartz-community/backlinks"
import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"
import type { QuartzComponentProps } from "@quartz-community/types"

interface BacklinksOptions {
  /** Hide the section entirely when no pages link here (default true). */
  hideWhenEmpty?: boolean
}

const chevron = h(
  "svg",
  {
    xmlns: "http://www.w3.org/2000/svg",
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    class: "fold",
    "aria-hidden": "true",
  },
  h("polyline", { points: "6 9 12 15 18 9" }),
)

/** Same click-toggle contract as the TOC plugin's toc.inline script. */
const toggleScript = `
function __backlinksToggle() {
  this.classList.toggle("collapsed")
  this.setAttribute("aria-expanded", this.getAttribute("aria-expanded") === "true" ? "false" : "true")
  const sibling = this.nextElementSibling
  if (sibling) sibling.classList.toggle("collapsed")
}
function __attachBacklinksToggles() {
  for (const el of document.getElementsByClassName("backlinks")) {
    const header = el.querySelector(".backlinks-header")
    if (!header) continue
    header.addEventListener("click", __backlinksToggle)
    if (window.addCleanup) {
      window.addCleanup(() => header.removeEventListener("click", __backlinksToggle))
    }
  }
}
document.addEventListener("nav", __attachBacklinksToggles)
document.addEventListener("render", __attachBacklinksToggles)
`

/** Collapse styles appended after upstream's own backlinks css. */
const collapseCss = `
.backlinks {
  overflow-y: hidden;
}
button.backlinks-header {
  background-color: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  padding: 0;
  color: var(--dark);
  display: flex;
  align-items: center;
  width: 100%;
}
button.backlinks-header h3 {
  font-size: 1rem;
  display: inline-block;
  margin: 0;
}
button.backlinks-header .fold {
  margin-left: 0.5rem;
  transition: transform 0.3s ease;
  opacity: 0.8;
  flex-shrink: 0;
}
button.backlinks-header.collapsed .fold {
  transform: rotateZ(-90deg);
}
.backlinks:has(button.backlinks-header.collapsed) {
  flex: 0 1 1.4rem;
}
.backlinks ul.overflow.collapsed {
  display: none;
}
`

/** Is this vdom node an element of the given type? */
const isElement = (node: unknown, type: string): boolean =>
  typeof node === "object" && node !== null && (node as { type?: unknown }).type === type

const BacklinksCollapse: QuartzComponentConstructor<BacklinksOptions> = (opts) => {
  const upstream = UpstreamBacklinks(opts)

  const BacklinksCollapsible = (props: QuartzComponentProps) => {
    const rendered = (upstream as unknown as (props: QuartzComponentProps) => preact.VNode)(props)
    if (!rendered) return rendered

    const children = (rendered.props as { children?: preact.ComponentChild }).children
    const list = Array.isArray(children) ? children : [children]
    const h3 = list.find((c) => isElement(c, "h3"))
    // The overflow list renders as upstream's OverflowList function
    // component — the only function-typed child of the section div.
    const listChild = list.find(
      (c) =>
        typeof c === "object" && c !== null && typeof (c as { type?: unknown }).type === "function",
    )
    if (!h3 || !listChild) {
      // Upstream shape changed — degrade to stock rendering.
      return rendered
    }

    // The generated list id is embedded in upstream's overflow-observer
    // script (getElementById("list-N")); reuse it for aria-controls.
    const idMatch = /getElementById\("([^"]+)"\)/.exec(String(upstream.afterDOMLoaded ?? ""))
    const ulId = idMatch?.[1]
    const header = h(
      "button",
      {
        type: "button",
        class: "backlinks-header",
        ...(ulId ? { "aria-controls": ulId } : {}),
        "aria-expanded": "true",
      },
      h3 as preact.VNode,
      chevron,
    )

    const newChildren = list.map((c) => (c === h3 ? header : c))
    return h(
      rendered.type as preact.ComponentType,
      rendered.props as Parameters<typeof h>[1],
      newChildren,
    )
  }

  const component = BacklinksCollapsible as QuartzComponent
  component.css = [upstream.css, collapseCss].filter(Boolean).join("\n")
  component.afterDOMLoaded = [upstream.afterDOMLoaded, toggleScript].filter(Boolean).join("\n")
  return component
}

export default BacklinksCollapse
export { BacklinksCollapse as Backlinks }
