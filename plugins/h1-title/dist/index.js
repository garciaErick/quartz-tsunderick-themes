// index.ts
function headingText(node) {
  const walk = (children) => children.map((child) => {
    switch (child.type) {
      case "text":
      case "inlineCode":
        return child.value;
      case "image":
        return child.alt ?? "";
      case "html":
        return "";
      default:
        return walk(child.children ?? []);
    }
  }).join("");
  return walk(node.children).replace(/\s+/g, " ").trim();
}
function H1Title() {
  return {
    name: "H1Title",
    markdownPlugins() {
      return [
        () => {
          return (tree, file) => {
            const frontmatter = file.data.frontmatter;
            if (!frontmatter) return;
            const isFilenameDefault = typeof frontmatter.title === "string" && frontmatter.title === (file.stem ?? "");
            const firstH1Index = tree.children.findIndex(
              (child) => child.type === "heading" && child.depth === 1
            );
            if (firstH1Index !== -1) {
              const text = headingText(tree.children[firstH1Index]);
              if (text) {
                if (isFilenameDefault) {
                  file.data.h1Title = text;
                  tree.children.splice(firstH1Index, 1);
                } else if (frontmatter.title === text) {
                  tree.children.splice(firstH1Index, 1);
                }
              }
            }
            for (const child of tree.children) {
              if (child.type === "heading" && child.depth === 1) {
                ;
                child.depth = 2;
              }
            }
          };
        }
      ];
    }
  };
}
export {
  H1Title as default
};
