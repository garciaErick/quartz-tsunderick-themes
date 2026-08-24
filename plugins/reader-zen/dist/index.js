// index.ts
import { ReaderMode as UpstreamReaderMode } from "@quartz-community/reader-mode";
var zenScript = `
;(function () {
  var LS_ITALIC = "quartz-zen-italic"
  var LS_WIDTH = "quartz-zen-width"

  var mode = false
  var italic = false
  var full = false
  try { italic = localStorage.getItem(LS_ITALIC) === "on" } catch (e) {}
  try { full = localStorage.getItem(LS_WIDTH) === "full" } catch (e) {}

  function store(key, value) {
    try { localStorage.setItem(key, value) } catch (e) {}
  }

  function applyZen() {
    var root = document.documentElement
    root.setAttribute("data-zen-italic", italic ? "on" : "off")
    root.setAttribute("data-zen-width", full ? "full" : "normal")
  }

  function applyMode() {
    var on = mode ? "on" : "off"
    document.documentElement.setAttribute("reader-mode", on)
    document.dispatchEvent(new CustomEvent("readermodechange", { detail: { mode: on } }))
  }

  function makeToggle(className, label, isOn, onclick) {
    var button = document.createElement("button")
    button.type = "button"
    button.className = "zen-toggle " + className
    button.title = label
    button.setAttribute("aria-label", label)
    button.setAttribute("aria-pressed", isOn ? "true" : "false")
    button.addEventListener("click", onclick)
    return button
  }

  function ensurePill() {
    var existing = document.getElementById("zen-controls")
    if (existing) existing.remove()
    if (!mode || !document.body) return

    var pill = document.createElement("div")
    pill.id = "zen-controls"
    pill.className = "zen-controls"
    pill.setAttribute("role", "group")
    pill.setAttribute("aria-label", "Reading options")

    var italicButton = makeToggle("zen-italic", "Italic body text", italic, function () {
      italic = !italic
      store(LS_ITALIC, italic ? "on" : "off")
      applyZen()
      ensurePill()
    })
    italicButton.textContent = "I"

    var widthButton = makeToggle("zen-width", "Full width", full, function () {
      full = !full
      store(LS_WIDTH, full ? "full" : "normal")
      applyZen()
      ensurePill()
    })
    widthButton.textContent = "\\u29E2"

    pill.appendChild(italicButton)
    pill.appendChild(widthButton)
    document.body.appendChild(pill)
    if (window.addCleanup) {
      window.addCleanup(function () { pill.remove() })
    }
  }

  function toggleMode() {
    mode = !mode
    applyMode()
    ensurePill()
  }

  function onNav() {
    var buttons = document.getElementsByClassName("readermode")
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i]
      button.addEventListener("click", toggleMode)
      if (window.addCleanup) {
        ;(function (button) {
          window.addCleanup(function () { button.removeEventListener("click", toggleMode) })
        })(button)
      }
    }
    applyMode()
    applyZen()
    ensurePill()
  }

  document.addEventListener("nav", onNav)
  document.addEventListener("render", onNav)
})()
`;
var ReaderZen = () => {
  const upstream = UpstreamReaderMode();
  const ZenReaderMode = (props) => {
    return upstream(props);
  };
  const component = ZenReaderMode;
  component.css = upstream.css;
  component.afterDOMLoaded = upstream.afterDOMLoaded;
  component.beforeDOMLoaded = zenScript;
  return component;
};
var index_default = ReaderZen;
export {
  ReaderZen as ReaderMode,
  index_default as default
};
