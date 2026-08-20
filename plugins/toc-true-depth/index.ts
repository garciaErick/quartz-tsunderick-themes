/**
 * TOC True Depth — makes table-of-contents entries carry their TRUE heading
 * levels (H2/H3/…) instead of upstream's level-relative depths.
 *
 * @quartz-community/table-of-contents normalizes every entry with
 * `depth = headingLevel - shallowestLevel`, so the common case (all sections
 * at the same level) renders a flat depth-0 wall. This transformer runs at
 * order 51 — right after the TOC transformer (order 50) — and overwrites
 * `file.data.toc[].depth` with the real heading levels re-walked from the
 * (already h1-title-demoted) tree. The component then emits depth-2/depth-3
 * classes that custom.scss styles with H-level prefixes.
 *
 * maxDepth MUST match the TOC transformer's maxDepth (default 3). If the
 * heading walk and the toc array disagree on count (upstream changed?), we
 * bail and leave the normalized depths — never a crash, never a wrong guess.
 */

import type { QuartzTransformerPlugin } from "@quartz-community/types"
import type { Root, Heading, Content, PhrasingContent } from "mdast"

interface TrueDepthOptions {
  /** Highest heading level to include — must equal the TOC transformer's maxDepth. */
  maxDepth?: number
}

const defaults: Required<TrueDepthOptions> = {
  maxDepth: 3,
}

const TrueDepthToc: QuartzTransformerPlugin<TrueDepthOptions> = (userOpts) => {
  const opts = { ...defaults, ...userOpts }
  return {
    name: "TrueDepthToc",
    markdownPlugins() {
      return [
        () => {
          return (tree: Root, file: { data: Record<string, unknown> }) => {
            const toc = file.data.toc as Array<{ depth?: number }> | undefined
            if (!Array.isArray(toc) || toc.length === 0) return

            // Same traversal as upstream's visit(tree, "heading"): document
            // order, recursive (headings can live inside blockquotes/lists).
            const depths: number[] = []
            const walk = (nodes: readonly Content[] | readonly PhrasingContent[]): void => {
              for (const node of nodes) {
                if (node.type === "heading") {
                  const heading = node as Heading
                  if (heading.depth <= opts.maxDepth) depths.push(heading.depth)
                }
                const children = (node as { children?: unknown[] }).children
                if (Array.isArray(children)) {
                  walk(children as readonly Content[] | readonly PhrasingContent[])
                }
              }
            }
            walk(tree.children)

            // 1:1 by document order only when the filters saw the same set.
            if (depths.length !== toc.length) return

            for (let i = 0; i < toc.length; i++) {
              toc[i].depth = depths[i]
            }
          }
        },
      ]
    },
  }
}

export default TrueDepthToc
