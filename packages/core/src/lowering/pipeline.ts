import type { SharedIirManifest } from "../manifest";
import type { ILoweringContext } from "./context";
import type { ILoweringPhase } from "./phase";

/**
 * The lowering pipeline transforms a Shared IIR model through a series
 * of independent phases, producing a platform-specific model.
 *
 * This mirrors compiler architectures like LLVM and Roslyn where
 * transformations are organized as independent passes.
 */
export class LoweringPipeline {
  private phases: ILoweringPhase[] = [];

  addPhase(phase: ILoweringPhase): void {
    this.phases.push(phase);
  }

  run(model: SharedIirManifest, context: ILoweringContext): SharedIirManifest {
    let current = model;
    for (const phase of this.phases) {
      current = phase.run(current, context);
    }
    return current;
  }

  listPhases(): ILoweringPhase[] {
    return this.phases;
  }
}
