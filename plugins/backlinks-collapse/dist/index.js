// index.ts
import { h } from "preact";
import { Backlinks as UpstreamBacklinks } from "@quartz-community/backlinks";
var chevron = h(
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
    "aria-hidden": "true"
  },
  h("polyline", { points: "6 9 12 15 18 9" })
);
var toggleScript = `
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
`;
var collapseCss = `
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
`;
var isElement = (node, type) => typeof node === "object" && node !== null && node.type === type;
var BacklinksCollapse = (opts) => {
  const upstream = UpstreamBacklinks(opts);
  const BacklinksCollapsible = (props) => {
    const rendered = upstream(props);
    if (!rendered) return rendered;
    const children = rendered.props.children;
    const list = Array.isArray(children) ? children : [children];
    const h3 = list.find((c) => isElement(c, "h3"));
    const listChild = list.find(
      (c) => typeof c === "object" && c !== null && typeof c.type === "function"
    );
    if (!h3 || !listChild) {
      return rendered;
    }
    const idMatch = /getElementById\("([^"]+)"\)/.exec(String(upstream.afterDOMLoaded ?? ""));
    const ulId = idMatch?.[1];
    const header = h(
      "button",
      {
        type: "button",
        class: "backlinks-header",
        ...ulId ? { "aria-controls": ulId } : {},
        "aria-expanded": "true"
      },
      h3,
      chevron
    );
    const newChildren = list.map((c) => c === h3 ? header : c);
    return h(
      rendered.type,
      rendered.props,
      newChildren
    );
  };
  const component = BacklinksCollapsible;
  component.css = [upstream.css, collapseCss].filter(Boolean).join("\n");
  component.afterDOMLoaded = [upstream.afterDOMLoaded, toggleScript].filter(Boolean).join("\n");
  return component;
};
var index_default = BacklinksCollapse;
export {
  BacklinksCollapse as Backlinks,
  index_default as default
};
