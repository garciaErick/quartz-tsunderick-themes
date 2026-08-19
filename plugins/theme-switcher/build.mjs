/**
 * Build script for the theme-switcher local plugin.
 *
 * Produces dist/index.js (emitter) and dist/components/index.js (component)
 * as ESM with shared code split into a common chunk. Runtime dependencies
 * (@quartz-themes/core, preact, lightningcss) are kept external so they
 * resolve against the host site's node_modules at build/serve time.
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
    "@quartz-themes/core",
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
import type { SwitchableTheme } from "./shared"

export interface ThemeConfigEntry {
  id: string
  label?: string
  modes?: "both" | "dark" | "light"
  type?: "package" | "typora"
}

export interface ThemeSwitcherOptions {
  themes?: ThemeConfigEntry[]
}

declare const ThemeSwitcherEmitter: QuartzEmitterPlugin<ThemeSwitcherOptions>

export default ThemeSwitcherEmitter

export type { SwitchableTheme }
`,
)
await writeFile(
  "dist/components/index.d.ts",
  `import type { QuartzComponentConstructor } from "@quartz-community/types"
declare const ThemeSwitcher: QuartzComponentConstructor
export { ThemeSwitcher }
`,
)
await writeFile(
  "dist/shared.d.ts",
  `export type ThemeModes = "both" | "dark" | "light"
export interface SwitchableTheme {
  id: string
  label: string
  modes: ThemeModes
  file: string | null
}
export declare function setThemeRegistry(themes: SwitchableTheme[]): void
export declare function getThemeRegistry(): SwitchableTheme[]
`,
)
