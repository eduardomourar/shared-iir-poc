/**
 * Enhanced resource model for Shared IIR
 *
 * Extends the basic resource model with comprehensive options and component support,
 * inspired by Pulumi's resource model and PCL.
 */

import type { Expression } from "./expression";

/**
 * Resource type identifier (provider-specific)
 */
export interface ResourceType {
  readonly provider: string;    // aws, azure, gcp, kubernetes
  readonly service: string;     // s3, lambda, storage, compute
  readonly resource: string;    // bucket, function, account, vm
}

/**
 * Base interface for all resource-like entities
 */
export interface IirResourceBase {
  readonly id: string;
  readonly resourceType: ResourceType;
  readonly properties: Record<string, Expression>;
  readonly options?: ResourceOptions;
}

/**
 * Regular resource (maps to provider resources)
 */
export interface IirResource extends IirResourceBase {
  readonly kind: 'Resource';
}

/**
 * Component resource (composite/reusable infrastructure pattern)
 * Maps to Pulumi ComponentResource, custom CDK constructs
 */
export interface IirComponent extends IirResourceBase {
  readonly kind: 'Component';
  readonly implementation?: ComponentImplementation;
}

/**
 * Component implementation details
 */
export interface ComponentImplementation {
  readonly type: 'inline' | 'external' | 'reference';
  readonly resources?: IirResourceOrComponent[];  // for inline
  readonly path?: string;  // for external
  readonly token?: string;  // for reference
}

/**
 * Union type for all resource-like entities
 */
export type IirResourceOrComponent = IirResource | IirComponent;

// ============================================================================
// Resource Options
// ============================================================================

/**
 * Comprehensive resource options (lifecycle, relationships, behavior)
 */
export interface ResourceOptions {
  readonly dependsOn?: string[];
  readonly provider?: string;
  readonly parent?: string;
  readonly protect?: boolean;
  readonly ignoreChanges?: string[];
  readonly deleteBeforeReplace?: boolean;
  readonly retainOnDelete?: boolean;
  readonly customTimeouts?: CustomTimeouts;
  readonly version?: string;
  readonly condition?: string;
  readonly additionalOptions?: Record<string, any>;
  readonly aliases?: ResourceAlias[];
  readonly importId?: string;
  readonly replaceOnChanges?: string[];
}

export interface CustomTimeouts {
  readonly create?: string;
  readonly update?: string;
  readonly delete?: string;
  readonly read?: string;
}

export interface ResourceAlias {
  readonly name?: string;
  readonly type?: string;
  readonly parent?: string;
}

/**
 * Resource metadata
 */
export interface ResourceMetadata {
  readonly sourceLocation?: SourceLocation;
  readonly documentation?: string;
  readonly labels?: Record<string, string>;
  readonly annotations?: Record<string, any>;
}

export interface SourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

// ============================================================================
// Helpers
// ============================================================================

export function createResource(
  id: string,
  resourceType: ResourceType,
  properties: Record<string, Expression>,
  options?: ResourceOptions
): IirResource {
  return {
    kind: 'Resource',
    id,
    resourceType,
    properties,
    options,
  };
}

export function createComponent(
  id: string,
  resourceType: ResourceType,
  properties: Record<string, Expression>,
  implementation?: ComponentImplementation,
  options?: ResourceOptions
): IirComponent {
  return {
    kind: 'Component',
    id,
    resourceType,
    properties,
    implementation,
    options,
  };
}

export function isResource(entity: IirResourceOrComponent): entity is IirResource {
  return entity.kind === 'Resource';
}

export function isComponent(entity: IirResourceOrComponent): entity is IirComponent {
  return entity.kind === 'Component';
}

export function extractDependencies(resource: IirResourceOrComponent): string[] {
  const deps: string[] = [];

  if (resource.options?.dependsOn) {
    deps.push(...resource.options.dependsOn);
  }

  if (resource.options?.parent) {
    deps.push(resource.options.parent);
  }

  if (resource.options?.provider) {
    deps.push(resource.options.provider);
  }

  return [...new Set(deps)];
}
