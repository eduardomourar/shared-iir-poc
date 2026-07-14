import type { SemanticCapability } from "./capability.ts";
import type { Dependency } from "./dependency.ts";
import type { Expression } from "./expression.ts";

export interface ResourceType {
  readonly provider: string;    // aws, azure, gcp, kubernetes
  readonly service: string;     // s3, lambda, storage, compute
  readonly resource: string;    // bucket, function, account, vm
}

export interface IirResource {
  readonly id: string;
  readonly resourceType: ResourceType;
  readonly properties: Record<string, Expression>;
  readonly dependencies: Dependency[];
  readonly conditionId?: string;
  readonly capabilities: SemanticCapability[];
}
