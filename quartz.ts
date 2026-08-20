import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { componentRegistry } from "./quartz/components/registry"
import type { ExplorerOptions } from "@quartz-community/explorer"

/**
 * Explorer: show the site root page (content/index.md) in the file tree.
 *
 * The explorer builds its trie client-side from contentIndex.json and merges
 * the root "index" page into the invisible trie root (it becomes root.data),
 * so the homepage never renders as an entry. We clone that data into a real
 * "Home" child and pin it first in the sort.
 *
 * These callbacks are serialized (Function.prototype.toString) and revived in
 * the browser — they must not reference any closed-over state. The "__isHome"
 * marker lives on the node itself so mapFn and sortFn can coordinate.
 */
type ExplorerNode = Parameters<NonNullable<ExplorerOptions["mapFn"]>>[0]
type Node = ExplorerNode & { __isHome?: boolean }

const homeFirstSort = (a: Node, b: Node): number => {
  if (a.__isHome || b.__isHome) {
    return a.__isHome && b.__isHome ? 0 : a.__isHome ? -1 : 1
  }
  // Upstream default: folders before files, then numeric-aware A→Z by title.
  if ((!a.isFolder && !b.isFolder) || (a.isFolder && b.isFolder)) {
    return (a.displayName || "").localeCompare(b.displayName || "", undefined, {
      numeric: true,
      sensitivity: "base",
    })
  }
  return a.isFolder ? -1 : 1
}

const injectHome = (node: Node): Node => {
  // Trie root only (empty slug segments) and only if it absorbed the root
  // index page. Clone it into a real child so it renders like a file entry;
  // data.slug "index" matches the homepage's data-slug for highlighting.
  if (
    node.slugSegments?.length === 0 &&
    node.data &&
    !node.children?.some((c) => (c as Node).__isHome)
  ) {
    const home = Object.create(Object.getPrototypeOf(node)) as Node
    home.slugSegments = ["index"]
    home.data = node.data
    home.children = []
    home.isFolder = false
    home.displayName = "Home"
    home.__isHome = true
    node.children.push(home)
  }
  return node
}

const explorerOptions = { mapFn: injectHome, sortFn: homeFirstSort }

// The layout builder looks option overrides up by the raw plugin source
// string ("@quartz-community/explorer"); the generated .quartz/plugins shim
// writes them under the normalized "quartz-community__explorer" key, which
// this Quartz version never reads. Set both so either lookup path resolves.
componentRegistry.setOptionOverrides("@quartz-community/explorer", explorerOptions)
componentRegistry.setOptionOverrides("quartz-community__explorer", explorerOptions)

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
