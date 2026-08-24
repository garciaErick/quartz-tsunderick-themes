/** Build reader-zen plugin dist/ (committed; Quartz loads local plugins as plain JS). */
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
  jsx: "automatic",
  jsxImportSource: "preact",
  external: [
    "@quartz-community/reader-mode",
    "@quartz-community/types",
    "@quartz-community/utils",
    "mdast",
    "preact",
    "preact/jsx-runtime",
  ],
  logLevel: "info",
})

// Hand-written declaration files: Quartz's plugin-index generator reads
// dist/*.d.ts and editors use them for config authoring.
await mkdir("dist/components", { recursive: true })
await writeFile(
  "dist/index.d.ts",
  `import type { QuartzComponentConstructor } from "@quartz-community/types"

declare const ReaderZen: QuartzComponentConstructor<{ enabled?: boolean }>

export default ReaderZen
export { ReaderZen as ReaderMode }
`,
)
await writeFile(
  "dist/components/index.d.ts",
  `import type { QuartzComponentConstructor } from "@quartz-community/types"
declare const ReaderMode: QuartzComponentConstructor<{ enabled?: boolean }>
export { ReaderMode }
`,
)
