// index.ts
var defaults = {
  maxDepth: 3
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
            if (depths.length !== toc.length) return;
            for (let i = 0; i < toc.length; i++) {
              toc[i].depth = depths[i];
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
