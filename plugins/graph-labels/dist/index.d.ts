import type { QuartzComponentConstructor } from "@quartz-community/types"
import type { GraphOptions } from "@quartz-community/graph"

declare const GraphWithLabels: QuartzComponentConstructor<Partial<GraphOptions>>

export default GraphWithLabels
export { GraphWithLabels as Graph }
