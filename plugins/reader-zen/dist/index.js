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
  // Full width defaults ON: only an explicit stored "normal" opts out, so
  // first-time entry is actually distraction-free (not fade-only + italic).
  try { full = localStorage.getItem(LS_WIDTH) !== "normal" } catch (e) {}

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

  function exitMode() {
    mode = false
    applyMode()
    ensurePill()
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

    // Exit: the guaranteed escape hatch \u2014 in full-width zen the toolbar
    // reader button is unreachable (its sidebar left the layout).
    var exitButton = document.createElement("button")
    exitButton.type = "button"
    exitButton.className = "zen-toggle zen-exit"
    exitButton.title = "Exit reader mode (Escape)"
    exitButton.setAttribute("aria-label", "Exit reader mode")
    exitButton.textContent = "Exit"
    exitButton.addEventListener("click", exitMode)

    var italicButton = makeToggle("zen-italic", "Italic body text", italic, function () {
      italic = !italic
      store(LS_ITALIC, italic ? "on" : "off")
      applyZen()
      ensurePill()
    })
    italicButton.textContent = "Italic"

    var widthButton = makeToggle("zen-width", "Full width", full, function () {
      full = !full
      store(LS_WIDTH, full ? "full" : "normal")
      applyZen()
      ensurePill()
    })
    widthButton.textContent = "Full width"

    pill.appendChild(exitButton)
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

  // Escape exits zen mode \u2014 unless the keystroke belongs to a focused
  // field (search overlay, inputs, contenteditable), where Escape means
  // "close that" instead. Registered ONCE for the page (the IIFE runs once
  // per load; SPA navs do not re-run beforeDOMLoaded), so it never
  // accumulates.
  function onKeyDown(e) {
    if (e.key !== "Escape" || !mode) return
    var t = e.target
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return
    exitMode()
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
  document.addEventListener("keydown", onKeyDown)
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
