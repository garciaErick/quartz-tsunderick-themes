import type { QuartzTransformerPlugin } from "@quartz-community/types"

export interface TrueDepthOptions {
  /** Highest heading level to include — must equal the TOC transformer's maxDepth. */
  maxDepth?: number
  /** Prepend the article's H1 (page title) as the first TOC entry (default true). */
  includeH1?: boolean
}

declare const TrueDepthToc: QuartzTransformerPlugin<TrueDepthOptions>

export default TrueDepthToc
