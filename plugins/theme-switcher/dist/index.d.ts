import type { QuartzEmitterPlugin } from "@quartz-community/types"
import type { SwitchableTheme } from "./shared"

export interface ThemeConfigEntry {
  id: string
  label?: string
  modes?: "both" | "dark" | "light"
  type?: "package" | "typora"
}

export interface ThemeSwitcherOptions {
  themes?: ThemeConfigEntry[]
}

declare const ThemeSwitcherEmitter: QuartzEmitterPlugin<ThemeSwitcherOptions>

export default ThemeSwitcherEmitter

export type { SwitchableTheme }
