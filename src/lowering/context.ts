import type { Diagnostic } from "../assembly/diagnostic.ts";
import { ProviderFeatureRegistry } from "../iir/shared/capability.ts";

export interface ILoweringContext {
  readonly targetPlatform: string;
  readonly featureRegistry: ProviderFeatureRegistry;
  readonly diagnostics: Diagnostic[];

  addDiagnostic(diagnostic: Diagnostic): void;
}

export class DefaultLoweringContext implements ILoweringContext {
  readonly targetPlatform: string;
  readonly featureRegistry: ProviderFeatureRegistry;
  readonly diagnostics: Diagnostic[] = [];

  constructor(targetPlatform: string, featureRegistry: ProviderFeatureRegistry) {
    this.targetPlatform = targetPlatform;
    this.featureRegistry = featureRegistry;
  }

  addDiagnostic(diagnostic: Diagnostic): void {
    this.diagnostics.push(diagnostic);
  }
}
