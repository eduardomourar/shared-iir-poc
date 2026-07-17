import type { IConstruct } from "constructs";
import type { SharedIirManifest } from "./manifest";

/**
 * Interface for extracting Shared IIR from construct trees
 */
export interface IIirExtractor {
  /**
   * Extract Shared IIR manifest from a construct tree
   * @param root Root construct (usually App or Stack)
   * @returns Shared IIR manifest with resources, outputs, configuration, and scoping
   */
  extract(root: IConstruct): SharedIirManifest;
}
