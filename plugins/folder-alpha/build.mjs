/** Build folder-alpha plugin dist/ (committed; Quartz loads local plugins as plain JS). */
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
  external: ["@quartz-community/folder-page", "@quartz-community/types", "@quartz-community/utils"],
  logLevel: "info",
})

await writeFile(
  "dist/index.d.ts",
  `import type { QuartzPageTypePlugin } from "@quartz-community/types"
import type { FolderPageOptions } from "@quartz-community/folder-page"
declare const FolderPageAlphabetical: QuartzPageTypePlugin<Partial<FolderPageOptions>>
export default FolderPageAlphabetical
`,
)
