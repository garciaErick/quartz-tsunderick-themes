/** Build h1-title plugin dist/ (committed; Quartz loads local plugins as plain JS). */
import { rm, writeFile } from "node:fs/promises"
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
  jsx: "automatic",
  jsxImportSource: "preact",
  external: [
    "@quartz-community/types",
    "@quartz-community/utils",
    "mdast",
    "preact",
    "preact/jsx-runtime",
  ],
  logLevel: "info",
})

await writeFile(
  "dist/index.d.ts",
  `import type { QuartzTransformerPlugin } from "@quartz-community/types"
declare const H1Title: QuartzTransformerPlugin
export default H1Title
`,
)
await writeFile(
  "dist/components/index.d.ts",
  `import type { QuartzComponentConstructor } from "@quartz-community/types"
declare const ArticleTitle: QuartzComponentConstructor
export { ArticleTitle }
`,
)
