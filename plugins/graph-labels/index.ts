/**
 * Graph View (Visible Labels) — wraps @quartz-community/graph.
 *
 * Upstream ships every node label with alpha=0 and only reveals labels on
 * hover or once you zoom far enough in (opacity ramps from 1x to ~4.75x
 * zoom). This wrapper patches the component's inline render script so node
 * names are always visible in both the sidebar graph and the fullscreen
 * global graph — no upstream fork, same options, same rendering otherwise.
 *
 * Patches are applied by exact string match against the minified script.
 * If @quartz-community/graph is ever upgraded and an anchor no longer
 * matches exactly once, that patch is skipped with a console warning and
 * the graph keeps working (with stock label behavior for that aspect).
 */

import { Graph as UpstreamGraph } from "@quartz-community/graph"
import type { GraphOptions } from "@quartz-community/graph"
import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

const PATCHES: Array<{ find: string; replace: string; label: string }> = [
  {
    // Labels are created invisible; only hover momentarily reveals them.
    find: "lu.anchor.set(.5,1.2),lu.alpha=0,",
    replace: "lu.anchor.set(.5,1.2),lu.alpha=1,",
    label: "initial label alpha",
  },
  {
    // On zoom, non-hovered labels fade to max((zoom*scale - 1)/3.75, 0) —
    // i.e. fully hidden below ~4.75x zoom. Keep them at full opacity.
    find: "Math.max((l-1)/3.75,0)",
    replace: "1",
    label: "zoom label fade",
  },
]

const GraphWithLabels: QuartzComponentConstructor<Partial<GraphOptions>> = (opts) => {
  const component: QuartzComponent = UpstreamGraph(opts)
  const script = component.afterDOMLoaded

  if (typeof script !== "string") {
    console.warn("[graph-labels] upstream afterDOMLoaded is not a string; skipping label patches")
    return component
  }

  let patched = script
  for (const { find, replace, label } of PATCHES) {
    const count = patched.split(find).length - 1
    if (count !== 1) {
      console.warn(
        `[graph-labels] skipping "${label}" patch: found ${count} matches for anchor (expected 1) — upstream changed?`,
      )
      continue
    }
    patched = patched.replace(find, replace)
  }

  component.afterDOMLoaded = patched
  return component
}

export default GraphWithLabels
export { GraphWithLabels as Graph }
