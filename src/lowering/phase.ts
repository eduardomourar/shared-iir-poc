import type { SharedIirManifest } from "../iir/shared/manifest.ts";
import type { ILoweringContext } from "./context.ts";

/**
 * A single lowering phase, analogous to a compiler pass.
 * Each phase transforms the semantic model independently.
 */
export interface ILoweringPhase {
  readonly id: string;
  readonly displayName: string;

  run(model: SharedIirManifest, context: ILoweringContext): SharedIirManifest;
}
