/**
 * Build script for the font-switcher local plugin.
 *
 * Produces dist/index.js (emitter) and dist/components/index.js (component)
 * as ESM with shared code split into a common chunk. Runtime dependencies
 * (@quartz-community/types, @quartz-community/utils, preact, lightningcss)
 * are kept external so they resolve against the host site's node_modules
 * at build/serve time.
 *
 * *.inline.ts files are transpiled then embedded as text (same technique
 * as Quartz's own inline-script-loader) and *.css is embedded as text.
 */
import { rm, writeFile, mkdir } from "node:fs/promises"
import { build, transform } from "esbuild"
import { readFile } from "node:fs/promises"

const inlineTextPlugin = {
  name: "inline-text",
  setup(builder) {
    builder.onLoad({ filter: /\.(inline\.ts|css)$/ }, async (args) => {
      const source = await readFile(args.path, "utf8")
      if (args.path.endsWith(".css")) {
        return { contents: source, loader: "text" }
      }
      const transpiled = await transform(source, {
        loader: "ts",
        target: "es2020",
        format: "esm",
      })
      // Inline scripts are modules only for strict tsc ("export {}");
      // strip module markers so the text is valid inside Quartz's
      // IIFE-wrapped component scripts (same as Quartz's inline-script-loader).
      const text = transpiled.code.replace(/^export\s+\{\}\s*;?\s*$/gm, "")
      return { contents: text, loader: "text" }
    })
  },
}

await rm("dist", { recursive: true, force: true })

await build({
  entryPoints: {
    index: "index.ts",
    "components/index": "components/index.ts",
  },
  outdir: "dist",
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "node",
  target: "node22",
  jsx: "automatic",
  jsxImportSource: "preact",
  external: [
    "@quartz-community/types",
    "@quartz-community/utils",
    "preact",
    "preact/jsx-runtime",
    "lightningcss",
  ],
  plugins: [inlineTextPlugin],
  logLevel: "info",
})

// Hand-written declaration files: Quartz's plugin-index generator reads
// dist/index.d.ts to build typed re-exports, and editors use them for
// config authoring.
await mkdir("dist/components", { recursive: true })
await writeFile(
  "dist/index.d.ts",
  `import type { QuartzEmitterPlugin } from "@quartz-community/types"
import type { SwitchableFont } from "./shared"

export interface FontConfigEntry {
  id: string
  label?: string
}

export interface FontSwitcherOptions {
  bakedFont?: string
  fonts?: FontConfigEntry[]
}

declare const FontSwitcherEmitter: QuartzEmitterPlugin<FontSwitcherOptions>

export default FontSwitcherEmitter

export type { SwitchableFont }
`,
)
await writeFile(
  "dist/components/index.d.ts",
  `import type { QuartzComponentConstructor } from "@quartz-community/types"
declare const FontSwitcher: QuartzComponentConstructor
export { FontSwitcher }
`,
)
await writeFile(
  "dist/shared.d.ts",
  `export interface SwitchableFont {
  id: string
  label: string
  file: string | null
  stack: string | null
}
export declare function setFontRegistry(fonts: SwitchableFont[]): void
export declare function getFontRegistry(): SwitchableFont[]
`,
)
