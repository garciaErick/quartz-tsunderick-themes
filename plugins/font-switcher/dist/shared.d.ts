export interface SwitchableFont {
  id: string
  label: string
  file: string | null
  stack: string | null
}
export declare function setFontRegistry(fonts: SwitchableFont[]): void
export declare function getFontRegistry(): SwitchableFont[]
