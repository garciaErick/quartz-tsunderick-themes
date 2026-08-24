// shared.ts
var REGISTRY_KEY = "__quartzFontSwitcherFonts";
function setFontRegistry(fonts) {
  ;
  globalThis[REGISTRY_KEY] = fonts;
}
function getFontRegistry() {
  return globalThis[REGISTRY_KEY] ?? [];
}
function pathToRoot(slug) {
  const ups = slug.split("/").length - 1;
  return ups === 0 ? "." : "../".repeat(ups);
}

export {
  setFontRegistry,
  getFontRegistry,
  pathToRoot
};
