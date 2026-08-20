/** Build toc-true-depth plugin dist/ (committed; Quartz loads local plugins as plain JS). */
import { rm, writeFile } from "node:fs/promises"
import { build } from "esbuild"

await rm("dist", { recursive: true, force: true })

await build({
  entryPoints: { index: "index.ts" },
  outdir: "dist",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  external: ["@quartz-community/types"],
  logLevel: "info",
})

await writeFile(
  "dist/index.d.ts",
  `import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface TrueDepthOptions {
  /** Highest heading level to include — must equal the TOC transformer's maxDepth. */
  maxDepth?: number
}

declare const TrueDepthToc: QuartzTransformerPlugin<TrueDepthOptions>

export default TrueDepthToc
`,
)
