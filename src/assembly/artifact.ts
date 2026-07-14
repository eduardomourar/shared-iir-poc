export const ArtifactType = {
  PLATFORM_MODEL: 'PLATFORM_MODEL',
  TEMPLATE: 'TEMPLATE',
  TERRAFORM_CONFIGURATION: 'TERRAFORM_CONFIGURATION',
  ARM_TEMPLATE: 'ARM_TEMPLATE',
  TREE: 'TREE',
  METADATA: 'METADATA',
  DIAGNOSTICS: 'DIAGNOSTICS',
} as const;

export type ArtifactType = typeof ArtifactType[keyof typeof ArtifactType];

export interface AssemblyArtifact {
  readonly id: string;
  readonly type: ArtifactType;
  readonly content?: unknown;
}
