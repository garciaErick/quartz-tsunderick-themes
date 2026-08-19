export type ThemeModes = "both" | "dark" | "light"
export interface SwitchableTheme {
  id: string
  label: string
  modes: ThemeModes
  file: string | null
}
export declare function setThemeRegistry(themes: SwitchableTheme[]): void
export declare function getThemeRegistry(): SwitchableTheme[]
