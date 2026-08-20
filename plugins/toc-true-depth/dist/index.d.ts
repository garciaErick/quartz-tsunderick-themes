import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface TrueDepthOptions {
  /** Highest heading level to include — must equal the TOC transformer's maxDepth. */
  maxDepth?: number
}

declare const TrueDepthToc: QuartzTransformerPlugin<TrueDepthOptions>

export default TrueDepthToc
