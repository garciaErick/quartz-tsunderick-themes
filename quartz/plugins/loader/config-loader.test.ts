import test, { describe, afterEach } from "node:test"
import assert from "node:assert"
import { buildLayoutForEntries, resolveGroups } from "./config-loader"
import { mergeQuartzConfigs } from "./merge-config"
import { componentRegistry } from "../../components/registry"
import type { QuartzComponent, QuartzComponentConstructor } from "../../components/types"
import { PluginJsonEntry, LayoutPosition, QuartzPluginsJson } from "./types"

const makeComponent = (name: string): QuartzComponent => {
  const c = (() => null) as unknown as QuartzComponent
  c.displayName = name
  return c
}

const makeConstructor = (name: string): QuartzComponentConstructor => {
  return () => makeComponent(name)
}

function makeEntry(
  source: string,
  layout?: { position: LayoutPosition; priority: number },
): PluginJsonEntry {
  return {
    source,
    enabled: true,
    options: {},
    ...(layout ? { layout: { position: layout.position, priority: layout.priority } } : {}),
  }
}

afterEach(() => {
  componentRegistry.clear()
})

describe("position assignment", () => {
  test("places component in correct position from layout.position", () => {
    const component = makeComponent("MyPlugin")
    componentRegistry.register("my-plugin", component, "test-source")

    const result = buildLayoutForEntries(
      [makeEntry("my-plugin", { position: "left", priority: 10 })],
      {},
    )
    assert.deepStrictEqual(result.left, [component])
  })

  test("places component in footer position", () => {
    const component = makeComponent("FooterComp")
    componentRegistry.register("footer-comp", component, "test-source")

    const result = buildLayoutForEntries(
      [makeEntry("footer-comp", { position: "footer", priority: 20 })],
      {},
    )
    assert.deepStrictEqual(result.footer, [component])
  })

  test("places component in header position", () => {
    const component = makeComponent("HeaderComp")
    componentRegistry.register("header-comp", component, "test-source")

    const result = buildLayoutForEntries(
      [makeEntry("header-comp", { position: "header", priority: 5 })],
      {},
    )
    assert.deepStrictEqual(result.header, [component])
  })

  test("returns empty arrays when no entries have layout", () => {
    const component = makeComponent("NoLayout")
    componentRegistry.register("no-layout", component, "test-source")

    const result = buildLayoutForEntries([makeEntry("no-layout")], {})
    assert.deepStrictEqual(result.header, [])
    assert.deepStrictEqual(result.left, [])
    assert.deepStrictEqual(result.right, [])
    assert.deepStrictEqual(result.beforeBody, [])
    assert.deepStrictEqual(result.afterBody, [])
    assert.deepStrictEqual(result.footer, [])
  })
})

describe("defaultPosition fallback", () => {
  test("uses manifest defaultPosition when no explicit layout", () => {
    const component = makeComponent("F")
    componentRegistry.register("f", component, "test-source", {
      name: "f",
      displayName: "F",
      description: "",
      version: "1",
      defaultPosition: "footer",
      defaultPriority: 50,
    })

    const result = buildLayoutForEntries([makeEntry("f")], {})
    assert.deepStrictEqual(result.footer, [component])
  })

  test("explicit layout takes precedence over defaultPosition", () => {
    const component = makeComponent("P")
    componentRegistry.register("p", component, "test-source", {
      name: "p",
      displayName: "P",
      description: "",
      version: "1",
      defaultPosition: "right",
    })

    const result = buildLayoutForEntries([makeEntry("p", { position: "left", priority: 10 })], {})
    assert.deepStrictEqual(result.left, [component])
    assert.deepStrictEqual(result.right, [])
  })

  test("silently skips invalid defaultPosition", () => {
    const component = makeComponent("Bad")
    componentRegistry.register("bad", component, "test-source", {
      name: "bad",
      displayName: "Bad",
      description: "",
      version: "1",
      defaultPosition: "body",
    })

    const result = buildLayoutForEntries([makeEntry("bad")], {})
    assert.deepStrictEqual(result.header, [])
    assert.deepStrictEqual(result.left, [])
    assert.deepStrictEqual(result.right, [])
    assert.deepStrictEqual(result.beforeBody, [])
    assert.deepStrictEqual(result.afterBody, [])
    assert.deepStrictEqual(result.footer, [])
  })
})

describe("priority sorting", () => {
  test("sorts components within a position by priority", () => {
    const compA = makeComponent("A")
    const compB = makeComponent("B")
    const compC = makeComponent("C")
    componentRegistry.register("a", compA, "test-source")
    componentRegistry.register("b", compB, "test-source")
    componentRegistry.register("c", compC, "test-source")

    const result = buildLayoutForEntries(
      [
        makeEntry("a", { position: "left", priority: 30 }),
        makeEntry("b", { position: "left", priority: 10 }),
        makeEntry("c", { position: "left", priority: 20 }),
      ],
      {},
    )

    const names = result.left?.map((component) => component.displayName)
    assert.deepStrictEqual(names, ["B", "C", "A"])
  })

  test("defaults to priority 50 for defaultPosition without defaultPriority", () => {
    const explicit = makeComponent("Explicit")
    const ctor = makeConstructor("Default")
    const defaulted = ctor(undefined)

    componentRegistry.register("explicit", explicit, "test-source")
    componentRegistry.register("defaulted", defaulted, "test-source", {
      name: "defaulted",
      displayName: "Default",
      description: "",
      version: "1",
      defaultPosition: "left",
    })

    const result = buildLayoutForEntries(
      [makeEntry("explicit", { position: "left", priority: 40 }), makeEntry("defaulted")],
      {},
    )

    const names = result.left?.map((component) => component.displayName)
    assert.deepStrictEqual(names, ["Explicit", "Default"])
  })
})

describe("resolveGroups", () => {
  test("returns ungrouped items in priority order", () => {
    const a = makeComponent("A")
    const b = makeComponent("B")
    const c = makeComponent("C")
    const items = [
      { component: a, priority: 30 },
      { component: b, priority: 10 },
      { component: c, priority: 20 },
    ]
    const result = resolveGroups(items, {})
    assert.strictEqual(result.length, 3)
    assert.strictEqual(result[0], b)
    assert.strictEqual(result[1], c)
    assert.strictEqual(result[2], a)
  })

  test("returns ungrouped items unchanged", () => {
    const a = makeComponent("A")
    const items = [{ component: a, priority: 10 }]
    const result = resolveGroups(items, {})
    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0], a)
  })

  test("returns empty array for empty input", () => {
    const result = resolveGroups([], {})
    assert.deepStrictEqual(result, [])
  })

  test("wraps grouped items in a Flex component", () => {
    const a = makeComponent("A")
    const b = makeComponent("B")
    const items = [
      { component: a, priority: 10, group: "toolbar" },
      { component: b, priority: 20, group: "toolbar" },
    ]
    const result = resolveGroups(items, {})
    assert.strictEqual(result.length, 1)
    assert.notStrictEqual(result[0], a)
    assert.notStrictEqual(result[0], b)
  })

  test("uses explicit group priority from config", () => {
    const grouped = makeComponent("Grouped")
    const ungrouped = makeComponent("Ungrouped")
    const items = [
      { component: grouped, priority: 50, group: "nav" },
      { component: ungrouped, priority: 10 },
    ]
    const result = resolveGroups(items, { nav: { priority: 5 } })
    assert.strictEqual(result.length, 2)
    assert.strictEqual(result[1], ungrouped)
  })

  test("falls back to first member priority when no group config", () => {
    const a = makeComponent("A")
    const b = makeComponent("B")
    const solo = makeComponent("Solo")
    const items = [
      { component: a, priority: 20, group: "nav" },
      { component: b, priority: 40, group: "nav" },
      { component: solo, priority: 30 },
    ]
    const result = resolveGroups(items, {})
    assert.strictEqual(result.length, 2)
    assert.strictEqual(result[1], solo)
  })

  test("single-member group still wraps in Flex", () => {
    const a = makeComponent("A")
    const items = [{ component: a, priority: 10, group: "solo" }]
    const result = resolveGroups(items, {})
    assert.strictEqual(result.length, 1)
    assert.notStrictEqual(result[0], a)
  })
})

describe("buildLayoutForEntries with display wrappers", () => {
  test("applies display wrapper for mobile-only", () => {
    const component = makeComponent("Wrapped")
    componentRegistry.register("wrapped-plugin", component, "test-source")

    const entry: PluginJsonEntry = {
      source: "wrapped-plugin",
      enabled: true,
      options: {},
      layout: { position: "left" as LayoutPosition, priority: 10, display: "mobile-only" },
    }
    const result = buildLayoutForEntries([entry], {})
    assert.strictEqual(result.left?.length, 1)
    assert.notStrictEqual(result.left?.[0], component)
  })
})

describe("buildLayoutForEntries with constructors", () => {
  test("instantiates constructor components via registry", () => {
    const ctor = makeConstructor("Instantiated")
    componentRegistry.register("ctor-plugin", ctor, "test-source")

    const result = buildLayoutForEntries(
      [makeEntry("ctor-plugin", { position: "left", priority: 10 })],
      {},
    )
    assert.strictEqual(result.left?.length, 1)
    assert.strictEqual(result.left?.[0].displayName, "Instantiated")
  })

  test("merges entry options with TS overrides for constructors", () => {
    const ctor = makeConstructor("Merged")
    componentRegistry.register("merge-plugin", ctor, "test-source")
    componentRegistry.setOptionOverrides("merge-plugin", { extra: true })

    const result = buildLayoutForEntries(
      [
        {
          source: "merge-plugin",
          enabled: true,
          options: { base: 1 },
          layout: { position: "right" as LayoutPosition, priority: 10 },
        },
      ],
      {},
    )
    assert.strictEqual(result.right?.length, 1)
  })
})

describe("config layering (mergeQuartzConfigs)", () => {
  const makeConfig = (overrides?: Partial<QuartzPluginsJson>): QuartzPluginsJson => ({
    configuration: {},
    plugins: [],
    ...overrides,
  })

  test("child inherits default entries it does not mention", () => {
    const defaults = makeConfig({
      plugins: [
        { source: "./plugins/toc-true-depth", enabled: true, order: 51 },
        { source: "@quartz-community/explorer", enabled: true },
      ],
    })
    const child = makeConfig({
      plugins: [{ source: "@quartz-community/explorer", enabled: true }],
    })

    const merged = mergeQuartzConfigs(defaults, child)
    const sources = merged.plugins.map((p) => p.source)
    assert.ok(sources.includes("./plugins/toc-true-depth"))
    const inherited = merged.plugins.find((p) => p.source === "./plugins/toc-true-depth")
    assert.strictEqual(inherited?.enabled, true)
    assert.strictEqual(inherited?.order, 51)
  })

  test("same-source child entry replaces the default entry wholesale", () => {
    const defaults = makeConfig({
      plugins: [
        {
          source: "@quartz-community/table-of-contents",
          enabled: true,
          order: 50,
          layout: { position: "right", priority: 30 },
        },
      ],
    })
    const child = makeConfig({
      plugins: [
        {
          source: "@quartz-community/table-of-contents",
          enabled: true,
          order: 50,
          layout: { position: "right", priority: 10 },
        },
      ],
    })

    const merged = mergeQuartzConfigs(defaults, child)
    assert.strictEqual(merged.plugins.length, 1)
    assert.strictEqual(merged.plugins[0].layout?.priority, 10)
  })

  test("explicit enabled:false child entry disables the inherited default", () => {
    const defaults = makeConfig({
      plugins: [{ source: "./plugins/toc-true-depth", enabled: true, order: 51 }],
    })
    const child = makeConfig({
      plugins: [{ source: "./plugins/toc-true-depth", enabled: false }],
    })

    const merged = mergeQuartzConfigs(defaults, child)
    assert.strictEqual(merged.plugins.length, 1)
    assert.strictEqual(merged.plugins[0].enabled, false)
    // The load path filters on enabled — simulate it:
    assert.strictEqual(merged.plugins.filter((p) => p.enabled).length, 0)
  })

  test('source identity ignores the "./" prefix so either spelling overrides', () => {
    const defaults = makeConfig({
      plugins: [{ source: "./plugins/toc-true-depth", enabled: true, order: 51 }],
    })
    const child = makeConfig({
      plugins: [{ source: "plugins/toc-true-depth", enabled: true, order: 55 }],
    })

    const merged = mergeQuartzConfigs(defaults, child)
    assert.strictEqual(merged.plugins.length, 1)
    assert.strictEqual(merged.plugins[0].order, 55)
  })

  test("configuration shallow-merges with child winning per key", () => {
    const defaults = makeConfig({ configuration: { baseUrl: "engine.dev", locale: "en-US" } })
    const child = makeConfig({ configuration: { baseUrl: "child.dev" } })

    const merged = mergeQuartzConfigs(defaults, child)
    assert.strictEqual((merged.configuration as Record<string, unknown>).baseUrl, "child.dev")
    assert.strictEqual((merged.configuration as Record<string, unknown>).locale, "en-US")
  })

  test("layout.byPageType merges per page type without clobbering default keys", () => {
    const defaults = makeConfig({
      layout: {
        byPageType: {
          folder: { exclude: ["reader-mode"], positions: { left: [] } },
        },
      },
    })
    const child = makeConfig({
      layout: {
        byPageType: {
          folder: { positions: { right: [] } },
        },
      },
    })

    const merged = mergeQuartzConfigs(defaults, child)
    const folder = merged.layout?.byPageType?.folder
    assert.deepStrictEqual(folder?.exclude, ["reader-mode"])
    assert.deepStrictEqual(folder?.positions?.right, [])
    assert.deepStrictEqual(folder?.positions?.left, [])
  })

  test("layout.groups merge per key with child winning", () => {
    const defaults = makeConfig({
      layout: { groups: { toolbar: { priority: 35, direction: "row" } } },
    })
    const child = makeConfig({ layout: { groups: { toolbar: { priority: 20 } } } })

    const merged = mergeQuartzConfigs(defaults, child)
    assert.strictEqual(merged.layout?.groups?.toolbar?.priority, 20)
    assert.strictEqual(merged.layout?.groups?.toolbar?.direction, "row")
  })

  test("child-only entries append after inherited defaults", () => {
    const defaults = makeConfig({
      plugins: [{ source: "@quartz-community/explorer", enabled: true }],
    })
    const child = makeConfig({
      plugins: [{ source: "./plugins/site-extra", enabled: true }],
    })

    const merged = mergeQuartzConfigs(defaults, child)
    assert.deepStrictEqual(
      merged.plugins.map((p) => p.source),
      ["@quartz-community/explorer", "./plugins/site-extra"],
    )
  })
})
