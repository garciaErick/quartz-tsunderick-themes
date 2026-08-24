import type { QuartzEmitterPlugin } from "@quartz-community/types"
import type { SwitchableFont } from "./shared"

export interface FontConfigEntry {
  id: string
  label?: string
}

export interface FontSwitcherOptions {
  bakedFont?: string
  fonts?: FontConfigEntry[]
}

declare const FontSwitcherEmitter: QuartzEmitterPlugin<FontSwitcherOptions>

export default FontSwitcherEmitter

export type { SwitchableFont }
