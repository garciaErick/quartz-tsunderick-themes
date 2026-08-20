// index.ts
import { FolderPage, FolderContent } from "@quartz-community/folder-page";
import { isFolderPath } from "@quartz-community/utils";
var byFilenameAlphabeticalFolderFirst = (f1, f2) => {
  const f1IsFolder = isFolderPath(f1.slug ?? "");
  const f2IsFolder = isFolderPath(f2.slug ?? "");
  if (f1IsFolder && !f2IsFolder) return -1;
  if (!f1IsFolder && f2IsFolder) return 1;
  const bySlug = (f1.slug ?? "").localeCompare(f2.slug ?? "");
  if (bySlug !== 0) return bySlug;
  const t1 = f1.frontmatter?.title?.toLowerCase() ?? "";
  const t2 = f2.frontmatter?.title?.toLowerCase() ?? "";
  return t1.localeCompare(t2);
};
var FolderPageAlphabetical = (opts) => {
  const plugin = FolderPage(opts);
  return {
    ...plugin,
    name: "FolderPageAlphabetical",
    body: () => FolderContent({ ...opts, sort: byFilenameAlphabeticalFolderFirst })
  };
};
var index_default = FolderPageAlphabetical;
export {
  index_default as default
};
