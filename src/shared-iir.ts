export interface ResourceType {
  readonly namespace: string; // e.g., 'aws.s3', 'azure.storage'[cite: 1]
  readonly kind: string;      // e.g., 'bucket', 'account'[cite: 1]
}

export interface IirReference {
  readonly targetResourceId: string;
  readonly attributePath: string[];
  readonly expectedType: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

export type IirExpression =
  | { kind: 'Literal'; value: any }
  | { kind: 'Reference'; reference: IirReference }
  | { kind: 'Concat'; parts: IirExpression[] }
  | { kind: 'Conditional'; conditionId: string; whenTrue: IirExpression; whenFalse: IirExpression }
  | { kind: 'List'; elements: IirExpression[] }
  | { kind: 'Map'; fields: Record<string, IirExpression> };

export interface Dependency {
  readonly target: string;
  readonly kind: 'Explicit' | 'Implicit' | 'Ordering' | 'Replacement';
}

export interface IirAsset {
  readonly id: string;
  readonly kind: 'DockerImage' | 'FileArchive';
  readonly sourcePath: string;
}

export interface IirCondition {
  readonly id: string;
  readonly expression: IirExpression;
}

export interface IirResource {
  readonly id: string;
  readonly resourceType: ResourceType;
  readonly properties: Record<string, IirExpression>;
  readonly dependencies: Dependency[];
  readonly conditionId?: string;
}

export interface IirOutput {
  readonly id: string;
  readonly value: IirExpression;
}

// Generics allow our core compiler assembly to ingest specialized platform resources
export interface GenericCloudAssembly<T extends IirResource = IirResource> {
  readonly conditions: IirCondition[];
  readonly assets: IirAsset[];
  readonly resources: T[];
  readonly outputs: IirOutput[];
}
