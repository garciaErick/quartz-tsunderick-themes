/**
 * H1 Title (split-field) — the article page shows the first root-level
 * `#` heading as its single top-level title, while `frontmatter.title`
 * (the filename) keeps feeding folder listings, breadcrumbs, explorer,
 * search, graph and the tab title.
 *
 * Ownership:
 *   frontmatter.title -> listing surfaces (filename; NEVER mutated here)
 *   fileData.h1Title  -> the article page's <h1> (rendered by this
 *                        plugin's ArticleTitle component)
 *
 * Runs at order 6, right after note-properties (order 5) which defaults
 * frontmatter.title to the filename.
 */

import type { QuartzTransformerPlugin } from "@quartz-community/types"
import type { Root, Heading, PhrasingContent } from "mdast"

/** Extract plain text from a heading's phrasing content. */
function headingText(node: Heading): string {
  const walk = (children: PhrasingContent[]): string =>
    children
      .map((child) => {
        switch (child.type) {
          case "text":
          case "inlineCode":
            return child.value
          case "image":
            return child.alt ?? ""
          case "html":
            return ""
          default:
            // emphasis/strong/link/delete/etc — recurse
            return walk((child as unknown as { children: PhrasingContent[] }).children ?? [])
        }
      })
      .join("")
  return walk(node.children).replace(/\s+/g, " ").trim()
}

export default function H1Title(): ReturnType<QuartzTransformerPlugin> {
  return {
    name: "H1Title",
    markdownPlugins() {
      return [
        () => {
          return (tree: Root, file: { stem?: string; data: Record<string, unknown> }) => {
            const frontmatter = file.data.frontmatter as { title?: string } | undefined
            if (!frontmatter) return

            // Is the current title still note-properties' filename default?
            const isFilenameDefault =
              typeof frontmatter.title === "string" && frontmatter.title === (file.stem ?? "")

            const firstH1Index = tree.children.findIndex(
              (child) => child.type === "heading" && child.depth === 1,
            )
            if (firstH1Index !== -1) {
              const text = headingText(tree.children[firstH1Index] as Heading)
              if (text) {
                if (isFilenameDefault) {
                  // Promote the heading text for the article page only.
                  file.data.h1Title = text
                  tree.children.splice(firstH1Index, 1)
                } else if (frontmatter.title === text) {
                  // Explicit title identical to the H1 — drop the body copy.
                  tree.children.splice(firstH1Index, 1)
                }
                // Explicit title that differs: the H1 is distinct section
                // content — it stays (demoted to h2 below) and the explicit
                // title remains the article title ("frontmatter wins").
              }
            }

            // Demote any remaining root-level H1s to H2 so every page has
            // exactly one top-level title. (`#` comments inside fenced code
            // blocks are code text, never affected.)
            for (const child of tree.children) {
              if (child.type === "heading" && (child as Heading).depth === 1) {
                ;(child as Heading).depth = 2
              }
            }
          }
        },
      ]
    },
  }
}
