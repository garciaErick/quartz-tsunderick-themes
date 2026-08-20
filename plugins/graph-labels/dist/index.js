// index.ts
import { Graph as UpstreamGraph } from "@quartz-community/graph";
var PATCHES = [
  {
    // Labels are created invisible; only hover momentarily reveals them.
    find: "lu.anchor.set(.5,1.2),lu.alpha=0,",
    replace: "lu.anchor.set(.5,1.2),lu.alpha=1,",
    label: "initial label alpha"
  },
  {
    // On zoom, non-hovered labels fade to max((zoom*scale - 1)/3.75, 0) —
    // i.e. fully hidden below ~4.75x zoom. Keep them at full opacity.
    find: "Math.max((l-1)/3.75,0)",
    replace: "1",
    label: "zoom label fade"
  }
];
var GraphWithLabels = (opts) => {
  const component = UpstreamGraph(opts);
  const script = component.afterDOMLoaded;
  if (typeof script !== "string") {
    console.warn("[graph-labels] upstream afterDOMLoaded is not a string; skipping label patches");
    return component;
  }
  let patched = script;
  for (const { find, replace, label } of PATCHES) {
    const count = patched.split(find).length - 1;
    if (count !== 1) {
      console.warn(
        `[graph-labels] skipping "${label}" patch: found ${count} matches for anchor (expected 1) \u2014 upstream changed?`
      );
      continue;
    }
    patched = patched.replace(find, replace);
  }
  component.afterDOMLoaded = patched;
  return component;
};
var index_default = GraphWithLabels;
export {
  GraphWithLabels as Graph,
  index_default as default
};
