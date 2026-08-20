/** Build graph-labels plugin dist/ (committed; Quartz loads local plugins as plain JS). */
import { rm, writeFile, mkdir } from "node:fs/promises"
import { build } from "esbuild"

await rm("dist", { recursive: true, force: true })

await build({
  entryPoints: {
    index: "index.ts",
    "components/index": "components/index.ts",
  },
  outdir: "dist",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  external: ["@quartz-community/graph", "@quartz-community/types"],
  logLevel: "info",
})

// Hand-written declaration files: Quartz's plugin-index generator reads
// dist/*.d.ts and editors use them for config authoring.
await mkdir("dist/components", { recursive: true })
await writeFile(
  "dist/index.d.ts",
  `import type { QuartzComponentConstructor } from "@quartz-community/types"
import type { GraphOptions } from "@quartz-community/graph"

declare const GraphWithLabels: QuartzComponentConstructor<Partial<GraphOptions>>

export default GraphWithLabels
export { GraphWithLabels as Graph }
`,
)
await writeFile(
  "dist/components/index.d.ts",
  `import type { QuartzComponentConstructor } from "@quartz-community/types"
import type { GraphOptions } from "@quartz-community/graph"

declare const Graph: QuartzComponentConstructor<Partial<GraphOptions>>
export { Graph }
`,
)
