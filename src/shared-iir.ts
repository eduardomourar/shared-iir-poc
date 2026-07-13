export interface ResourceType {
  readonly namespace: string; // e.g., 'aws.s3', 'azure.storage'
  readonly kind: string;      // e.g., 'bucket', 'account'
}

export interface IirReference {
  readonly targetResourceId: string;
  readonly attributePath: string[];
  readonly expectedType: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

/**
 * JSII-friendly expression model:
 * - Single interface (no TypeScript union) with a `kind` discriminant.
 * - Optional properties for each expression variant.
 * - `fields` uses a string-indexed map of nested expressions.
 */
export interface IirExpression {
  readonly kind: 'Literal' | 'Reference' | 'Concat' | 'Conditional' | 'List' | 'Map';

  // Literal
  readonly literalValue?: string | number | boolean;

  // Reference
  readonly reference?: IirReference;

  // Concat
  readonly parts?: IirExpression[];

  // Conditional
  readonly conditionId?: string;
  readonly whenTrue?: IirExpression;
  readonly whenFalse?: IirExpression;

  // List
  readonly elements?: IirExpression[];

  // Map
  readonly fields?: Record<string, IirExpression>;
}

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

// Concrete, non-generic assembly for JSII
export interface CloudAssembly {
  readonly conditions: IirCondition[];
  readonly assets: IirAsset[];
  readonly resources: IirResource[];
  readonly outputs: IirOutput[];
}
