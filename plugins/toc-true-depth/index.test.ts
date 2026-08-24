import test, { describe } from "node:test"
import assert from "node:assert"
import TrueDepthToc from "./index"

type TocEntry = { depth?: number; slug?: string; text?: string }

interface FakeFile {
  data: {
    toc?: TocEntry[]
    h1Title?: string
    frontmatter?: { title?: string }
  }
}

const heading = (depth: number, text: string) => ({
  type: "heading",
  depth,
  children: [{ type: "text", value: text }],
})

/** Run the plugin's markdown transformer over a fake tree/file. */
function run(opts: Record<string, unknown> | undefined, tree: object, file: FakeFile): void {
  const instance = (
    TrueDepthToc as unknown as (o?: Record<string, unknown>) => {
      markdownPlugins: (ctx?: unknown) => (() => (t: unknown, f: unknown) => void)[]
    }
  )(opts)
  const transformer = instance.markdownPlugins()[0]
  transformer()(tree, file)
}

describe("TrueDepthToc — true depth rewrite", () => {
  test("rewrites relative depths to true heading levels 1:1", () => {
    const file: FakeFile = {
      data: {
        toc: [
          { depth: 0, slug: "a", text: "A" },
          { depth: 1, slug: "b", text: "B" },
        ],
      },
    }
    run(undefined, { type: "root", children: [heading(2, "A"), heading(3, "B")] }, file)
    assert.strictEqual(file.data.toc?.[0].depth, 2)
    assert.strictEqual(file.data.toc?.[1].depth, 3)
  })

  test("bails on count mismatch but still prepends the H1 entry", () => {
    const file: FakeFile = {
      data: { toc: [{ depth: 0, slug: "a", text: "A" }], h1Title: "Mismatch Page" },
    }
    // tree has two h2s but toc has one entry → rewrite bails
    run(undefined, { type: "root", children: [heading(2, "A"), heading(2, "B")] }, file)
    assert.strictEqual(file.data.toc?.[0].slug, "article-title")
    assert.strictEqual(file.data.toc?.[0].depth, 1)
    // original entry untouched (bailed rewrite)
    assert.strictEqual(file.data.toc?.[1].depth, 0)
  })
})

describe("TrueDepthToc — H1 entry prepend", () => {
  test("prepends the article title as depth-1 entry with the shared anchor slug", () => {
    const file: FakeFile = {
      data: { toc: [{ depth: 0, slug: "a", text: "A" }], h1Title: "My Page Title" },
    }
    run(undefined, { type: "root", children: [heading(2, "A")] }, file)
    assert.strictEqual(file.data.toc?.length, 2)
    assert.deepStrictEqual(file.data.toc?.[0], {
      depth: 1,
      slug: "article-title",
      text: "My Page Title",
    })
    assert.strictEqual(file.data.toc?.[1].depth, 2)
  })

  test("falls back to frontmatter.title when h1Title is absent", () => {
    const file: FakeFile = {
      data: { toc: [{ depth: 0, slug: "a", text: "A" }], frontmatter: { title: "filename-title" } },
    }
    run(undefined, { type: "root", children: [heading(2, "A")] }, file)
    assert.strictEqual(file.data.toc?.[0].text, "filename-title")
  })

  test("no prepend when neither h1Title nor frontmatter.title exists", () => {
    const file: FakeFile = { data: { toc: [{ depth: 0, slug: "a", text: "A" }] } }
    run(undefined, { type: "root", children: [heading(2, "A")] }, file)
    assert.strictEqual(file.data.toc?.length, 1)
    assert.strictEqual(file.data.toc?.[0].slug, "a")
  })

  test("does not clobber a real heading that already claimed the anchor slug", () => {
    const file: FakeFile = {
      data: { toc: [{ depth: 0, slug: "article-title", text: "Article Title" }], h1Title: "T" },
    }
    run(undefined, { type: "root", children: [heading(2, "Article Title")] }, file)
    assert.strictEqual(file.data.toc?.length, 1)
    assert.strictEqual(file.data.toc?.[0].text, "Article Title")
  })

  test("includeH1: false opts out entirely", () => {
    const file: FakeFile = {
      data: { toc: [{ depth: 0, slug: "a", text: "A" }], h1Title: "My Page Title" },
    }
    run({ includeH1: false }, { type: "root", children: [heading(2, "A")] }, file)
    assert.strictEqual(file.data.toc?.length, 1)
    assert.strictEqual(file.data.toc?.[0].slug, "a")
  })

  test("empty toc (title-only page) is left alone — no TOC for those pages", () => {
    const file: FakeFile = { data: { toc: [], h1Title: "Only A Title" } }
    run(undefined, { type: "root", children: [] }, file)
    assert.strictEqual(file.data.toc?.length, 0)
  })

  test("missing toc data is a no-op", () => {
    const file: FakeFile = { data: { h1Title: "T" } }
    run(undefined, { type: "root", children: [heading(2, "A")] }, file)
    assert.strictEqual(file.data.toc, undefined)
  })
})
