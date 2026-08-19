// shared.ts
var REGISTRY_KEY = "__quartzThemeSwitcherThemes";
function setThemeRegistry(themes) {
  ;
  globalThis[REGISTRY_KEY] = themes;
}
function getThemeRegistry() {
  return globalThis[REGISTRY_KEY] ?? [];
}

export {
  setThemeRegistry,
  getThemeRegistry
};
