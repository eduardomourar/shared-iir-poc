export interface SemanticCapability {
  readonly id: string;
  readonly required: boolean;
}

export interface CapabilityConstraint {
  readonly type: string;
  readonly value: unknown;
}

export interface CapabilityResolution {
  readonly capability: SemanticCapability;
  readonly supported: boolean;
  readonly mappedProperties?: Record<string, unknown>;
}

/**
 * Minimal resource descriptor for capability resolution.
 * Avoids circular imports with IirResource.
 */
export interface ResourceDescriptor {
  readonly id: string;
  readonly resourceType: ResourceTypeDescriptor;
}

export interface ResourceTypeDescriptor {
  readonly provider: string;
  readonly service: string;
  readonly resource: string;
}

/**
 * Resolves semantic capabilities into provider-specific features.
 */
export interface ICapabilityResolver {
  resolve(capability: SemanticCapability, resource: ResourceDescriptor): CapabilityResolution;
}

/**
 * Registry of provider features that maps semantic capabilities
 * to concrete provider implementations.
 */
export class ProviderFeatureRegistry {
  private resolvers = new Map<string, ICapabilityResolver>();

  registerResolver(providerId: string, resolver: ICapabilityResolver): void {
    this.resolvers.set(providerId, resolver);
  }

  getResolver(providerId: string): ICapabilityResolver | undefined {
    return this.resolvers.get(providerId);
  }

  resolve(providerId: string, capability: SemanticCapability, resource: ResourceDescriptor): CapabilityResolution {
    const resolver = this.resolvers.get(providerId);
    if (!resolver) {
      return { capability, supported: false };
    }
    return resolver.resolve(capability, resource);
  }
}
