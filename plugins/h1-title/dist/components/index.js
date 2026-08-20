// components/ArticleTitle.tsx
import { jsx } from "preact/jsx-runtime";
var ArticleTitle = ({ fileData, displayClass }) => {
  const h1Title = fileData?.h1Title;
  const title = h1Title ?? fileData.frontmatter?.title;
  if (!title) return null;
  const classes = [displayClass, "article-title"].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx("h1", { class: classes, children: title });
};
ArticleTitle.css = `
.article-title {
  margin: 2rem 0 0 0;
}
`;
var ArticleTitle_default = (() => ArticleTitle);
export {
  ArticleTitle_default as ArticleTitle
};
