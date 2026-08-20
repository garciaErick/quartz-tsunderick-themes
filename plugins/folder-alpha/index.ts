/**
 * Folder Page (Alphabetical) — wraps @quartz-community/folder-page so
 * folder index pages list entries alphabetically instead of by date.
 *
 * Ordering: subfolders first (Quartz convention), then files — each group
 * sorted A→Z by FILENAME (slug), which keeps numeric prefixes (1-, 2-, x-)
 * in control of the order regardless of edit dates. Display titles come
 * from frontmatter.title (the author's H1 once plugins/h1-title is
 * enabled); dates still render, they just stop controlling order.
 *
 * Everything else (virtual page generation, folder matching, layout,
 * subfolder cards, counts, options) is delegated to upstream — no fork.
 */

import type { QuartzPageTypePlugin, SortFn } from "@quartz-community/types"
import type { FolderPageOptions } from "@quartz-community/folder-page"
import { FolderPage, FolderContent } from "@quartz-community/folder-page"
import { isFolderPath } from "@quartz-community/utils"

const byFilenameAlphabeticalFolderFirst: SortFn = (f1, f2) => {
  // Folders before files (matches upstream's grouping convention)
  const f1IsFolder = isFolderPath(f1.slug ?? "")
  const f2IsFolder = isFolderPath(f2.slug ?? "")
  if (f1IsFolder && !f2IsFolder) return -1
  if (!f1IsFolder && f2IsFolder) return 1

  // Sort by filename (slug): keeps 1-, 2-, x- prefixes in control
  const bySlug = (f1.slug ?? "").localeCompare(f2.slug ?? "")
  if (bySlug !== 0) return bySlug

  // Tiebreak on the displayed title
  const t1 = f1.frontmatter?.title?.toLowerCase() ?? ""
  const t2 = f2.frontmatter?.title?.toLowerCase() ?? ""
  return t1.localeCompare(t2)
}

const FolderPageAlphabetical: QuartzPageTypePlugin<Partial<FolderPageOptions>> = (opts) => {
  const plugin = FolderPage(opts)
  return {
    ...plugin,
    name: "FolderPageAlphabetical",
    body: () => FolderContent({ ...opts, sort: byFilenameAlphabeticalFolderFirst }),
  }
}

export default FolderPageAlphabetical
