import type { SharedIirManifest } from "../manifest";
import type { ILoweringContext } from "./context";

/**
 * A single lowering phase, analogous to a compiler pass.
 * Each phase transforms the semantic model independently.
 */
export interface ILoweringPhase {
  readonly id: string;
  readonly displayName: string;

  run(model: SharedIirManifest, context: ILoweringContext): SharedIirManifest;
}
