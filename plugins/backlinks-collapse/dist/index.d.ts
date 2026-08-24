import type { QuartzComponentConstructor } from "@quartz-community/types"

interface BacklinksOptions {
  hideWhenEmpty?: boolean
}

declare const BacklinksCollapse: QuartzComponentConstructor<BacklinksOptions>

export default BacklinksCollapse
export { BacklinksCollapse as Backlinks }
