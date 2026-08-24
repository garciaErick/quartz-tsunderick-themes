// index.ts
var ARTICLE_TITLE_ID = "article-title";
var defaults = {
  maxDepth: 3,
  includeH1: true
};
var TrueDepthToc = (userOpts) => {
  const opts = { ...defaults, ...userOpts };
  return {
    name: "TrueDepthToc",
    markdownPlugins() {
      return [
        () => {
          return (tree, file) => {
            const toc = file.data.toc;
            if (!Array.isArray(toc) || toc.length === 0) return;
            const depths = [];
            const walk = (nodes) => {
              for (const node of nodes) {
                if (node.type === "heading") {
                  const heading = node;
                  if (heading.depth <= opts.maxDepth) depths.push(heading.depth);
                }
                const children = node.children;
                if (Array.isArray(children)) {
                  walk(children);
                }
              }
            };
            walk(tree.children);
            if (depths.length === toc.length) {
              for (let i = 0; i < toc.length; i++) {
                toc[i].depth = depths[i];
              }
            }
            if (opts.includeH1 && !toc.some((e) => e.slug === ARTICLE_TITLE_ID)) {
              const h1Title = file.data.h1Title ?? file.data.frontmatter?.title;
              if (h1Title) {
                toc.unshift({ depth: 1, slug: ARTICLE_TITLE_ID, text: h1Title });
              }
            }
          };
        }
      ];
    }
  };
};
var index_default = TrueDepthToc;
export {
  index_default as default
};
