import type { IConstruct } from "constructs";
import type { SharedIirManifest } from "./manifest";

/**
 * Extractor interface for synthesis-time extraction of Shared IIR.
 *
 * Following the common-denominator analysis:
 * - Synthesis-time tool, not construct-time framework
 * - Minimal abstraction (similar to constructs library)
 * - Non-invasive (opt-in hook)
 * - No semantic capabilities - just data extraction
 */
export interface IIirExtractor {
  /**
   * Extract thin IR from a construct tree at synthesis time.
   *
   * @param app - Root construct (App, Stack, or any IConstruct)
   * @returns Thin IIR manifest containing extracted resources
   */
  extract(app: IConstruct): SharedIirManifest;
}
