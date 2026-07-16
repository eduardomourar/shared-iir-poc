/**
 * Minimal capability registry for lowering context
 * Used for provider-specific feature resolution during lowering
 */

export class ProviderFeatureRegistry {
  private features = new Map<string, Map<string, any>>();

  registerFeature(provider: string, feature: string, implementation: any): void {
    if (!this.features.has(provider)) {
      this.features.set(provider, new Map());
    }
    this.features.get(provider)!.set(feature, implementation);
  }

  getFeature(provider: string, feature: string): any | undefined {
    return this.features.get(provider)?.get(feature);
  }

  hasFeature(provider: string, feature: string): boolean {
    return this.features.get(provider)?.has(feature) ?? false;
  }
}
