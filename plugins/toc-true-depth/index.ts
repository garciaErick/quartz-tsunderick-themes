/**
 * TOC True Depth — makes table-of-contents entries carry their TRUE heading
 * levels (H2/H3/…) instead of upstream's level-relative depths, and prepends
 * the article's H1 (page title) as the first entry.
 *
 * @quartz-community/table-of-contents normalizes every entry with
 * `depth = headingLevel - shallowestLevel`, so the common case (all sections
 * at the same level) renders a flat depth-0 wall. This transformer runs at
 * order 51 — right after the TOC transformer (order 50) — and overwrites
 * `file.data.toc[].depth` with the real heading levels re-walked from the
 * (already h1-title-demoted) tree. The component then emits depth-2/depth-3
 * classes that custom.scss styles with H-level prefixes.
 *
 * H1 entry: style guides allow exactly one top-level H1 per page, and the
 * h1-title plugin (order 6) splices it out of the body as the article title
 * before the TOC transformer runs — so the TOC can never contain it
 * naturally. To keep the outline complete we PREPEND a synthetic entry
 * `{ depth: 1, slug: "article-title", text }` whose text matches the
 * rendered title (h1Title, falling back to frontmatter.title — the same
 * precedence as h1-title's ArticleTitle component). h1-title's component
 * renders its <h1> with id="article-title", so the entry links (and the
 * TOC scroll-spy highlights it, since the observer watches h1[id] and
 * matches a[data-for]). The fixed slug avoids collisions with a section
 * genuinely titled "Article Title"; if one somehow exists we skip the
 * prepend rather than clobber it. Pages with no other TOC entries keep
 * their no-TOC rendering (upstream already omits the TOC there).
 *
 * maxDepth MUST match the TOC transformer's maxDepth (default 3). If the
 * heading walk and the toc array disagree on count (upstream changed?), we
 * bail and leave the normalized depths — never a crash, never a wrong guess.
 * The H1 prepend is independent of that rewrite and still applies.
 */

import type { QuartzTransformerPlugin } from "@quartz-community/types"
import type { Root, Heading, Content, PhrasingContent } from "mdast"

interface TrueDepthOptions {
  /** Highest heading level to include — must equal the TOC transformer's maxDepth. */
  maxDepth?: number
  /** Prepend the article's H1 (page title) as the first TOC entry (default true). */
  includeH1?: boolean
}

/** Anchor id shared with h1-title's ArticleTitle component. */
const ARTICLE_TITLE_ID = "article-title"

const defaults: Required<TrueDepthOptions> = {
  maxDepth: 3,
  includeH1: true,
}

interface TocEntry {
  depth?: number
  slug?: string
  text?: string
}

const TrueDepthToc: QuartzTransformerPlugin<TrueDepthOptions> = (userOpts) => {
  const opts = { ...defaults, ...userOpts }
  return {
    name: "TrueDepthToc",
    markdownPlugins() {
      return [
        () => {
          return (tree: Root, file: { data: Record<string, unknown> }) => {
            const toc = file.data.toc as TocEntry[] | undefined
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
            if (depths.length === toc.length) {
              for (let i = 0; i < toc.length; i++) {
                toc[i].depth = depths[i]
              }
            }

            // Prepend the article title as the H1 entry (see docblock). Only
            // when other entries exist (title-only pages keep no TOC) and no
            // real heading already claimed the shared anchor id.
            if (opts.includeH1 && !toc.some((e) => e.slug === ARTICLE_TITLE_ID)) {
              const h1Title =
                (file.data.h1Title as string | undefined) ??
                (file.data.frontmatter as { title?: string } | undefined)?.title
              if (h1Title) {
                toc.unshift({ depth: 1, slug: ARTICLE_TITLE_ID, text: h1Title })
              }
            }
          }
        },
      ]
    },
  }
}

export default TrueDepthToc
