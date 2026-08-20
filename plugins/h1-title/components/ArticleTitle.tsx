import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"
import type { QuartzComponentProps } from "@quartz-community/types"

/**
 * ArticleTitle — renders the page's single top-level <h1>.
 *
 * Precedence: the file's first root-level `#` heading (promoted to
 * `fileData.h1Title` by this plugin's transformer), falling back to
 * `frontmatter.title` (the filename) for files without an H1 — e.g.
 * virtual folder/tag pages.
 *
 * Folder listings, breadcrumbs, explorer, search, graph and the tab title
 * keep reading frontmatter.title (the filename); only the article page
 * shows the heading text.
 */
const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const h1Title = (fileData as { h1Title?: string } | undefined)?.h1Title
  const title = h1Title ?? fileData.frontmatter?.title
  if (!title) return null

  const classes = [displayClass, "article-title"].filter(Boolean).join(" ")
  return <h1 class={classes}>{title}</h1>
}

ArticleTitle.css = `
.article-title {
  margin: 2rem 0 0 0;
}
`

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
