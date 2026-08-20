// shared.ts
var REGISTRY_KEY = "__quartzThemeSwitcherThemes";
function setThemeRegistry(themes) {
  ;
  globalThis[REGISTRY_KEY] = themes;
}
function getThemeRegistry() {
  return globalThis[REGISTRY_KEY] ?? [];
}
function pathToRoot(slug) {
  const ups = slug.split("/").length - 1;
  return ups === 0 ? "." : "../".repeat(ups);
}

export {
  setThemeRegistry,
  getThemeRegistry,
  pathToRoot
};
