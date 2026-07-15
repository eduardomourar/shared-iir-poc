import type { Expression } from "./expression";
import type { Dependency } from "./dependency";

/**
 * Core IR model - types for extraction, lowering, and serialization
 */

/**
 * Resource type identifier (provider-specific)
 */
export interface ResourceType {
  readonly provider: string;    // aws, azure, gcp, kubernetes
  readonly service: string;     // s3, lambda, storage, compute
  readonly resource: string;    // bucket, function, account, vm
}

/**
 * Extracted resource - core representation
 */
export interface IirResource {
  readonly id: string;
  readonly resourceType: ResourceType;
  readonly properties: Record<string, Expression>;
  readonly dependencies: Dependency[];
  readonly conditionId?: string;
}

// Re-export Expression for convenience
export type { Expression } from "./expression";
