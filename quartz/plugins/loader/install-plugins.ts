#!/usr/bin/env node
import { installPlugins, parsePluginSource, regeneratePluginIndex } from "./gitLoader.js"
import { readEffectivePluginsJson } from "./merge-config.js"
import type { PluginSource } from "./types.js"

async function getExternalPluginSources(): Promise<PluginSource[]> {
  try {
    const module = await import("../../../quartz.js")
    const config = module.default ?? module
    const externalPlugins = config.externalPlugins
    if (Array.isArray(externalPlugins) && externalPlugins.length > 0) {
      return externalPlugins as PluginSource[]
    }
  } catch {
    // fall back to config yaml parsing
  }

  // Layered read (child config over engine default) so inherited default
  // plugins are installed too — see merge-config.ts for the semantics.
  const pluginsJson = readEffectivePluginsJson()
  const entries = pluginsJson?.plugins ?? []
  return entries.filter((entry) => entry.enabled !== false).map((entry) => entry.source)
}

async function main() {
  const externalPlugins = await getExternalPluginSources()

  if (externalPlugins.length === 0) {
    console.log("No external plugins to install.")
    return
  }

  const specs = externalPlugins
    .map((source: PluginSource) => parsePluginSource(source))
    .filter((spec) => !spec.npmPackage)

  const npmSpecs = externalPlugins
    .map((source: PluginSource) => parsePluginSource(source))
    .filter((spec) => spec.npmPackage)

  if (specs.length === 0 && npmSpecs.length === 0) {
    console.log("No external plugins to install.")
    return
  }

  if (specs.length > 0) {
    console.log(`Installing ${specs.length} plugin(s) from Git...`)
    const installed = await installPlugins(specs, { verbose: true })

    if (installed.size === specs.length) {
      console.log("✓ All Git plugins installed successfully")
    } else {
      console.error(`✗ Only ${installed.size}/${specs.length} Git plugins installed`)
      process.exit(1)
    }
  }

  if (npmSpecs.length > 0) {
    console.log(`Found ${npmSpecs.length} npm plugin(s), regenerating plugin index...`)
    await regeneratePluginIndex({ verbose: true, npmPackages: npmSpecs.map((s) => s.name) })
  }
}

main().catch((err) => {
  console.error("Failed to install plugins:", err)
  process.exit(1)
})
