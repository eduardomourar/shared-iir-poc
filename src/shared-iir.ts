// Models expressions and token references independently of deployment syntax
export type IirExpression = 
  | { kind: 'Literal'; value: any }
  | { kind: 'Reference'; targetResourceId: string; attributePath: string[] };

export interface IirResource {
  readonly id: string;
  readonly kind: string; // Cloud-neutral semantic type, e.g., "bucket", "virtual-network"[cite: 1]
  readonly properties: Record<string, IirExpression>;
  readonly dependencies: string[]; // Explicit dependency graph tracking[cite: 1]
}

export interface IirOutput {
  readonly id: string;
  readonly value: IirExpression;
}

// Canonical stable semantic contract between libraries and runtimes[cite: 1]
export interface SharedIirManifest {
  readonly resources: IirResource[];
  readonly outputs: IirOutput[];
}
