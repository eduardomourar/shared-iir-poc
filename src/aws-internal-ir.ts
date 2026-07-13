import type { SharedIirManifest, IirResource } from './shared-iir.ts';

export interface AwsSpecificMetadata {
  readonly deletionPolicy?: 'Delete' | 'Retain' | 'Snapshot'; // CloudFormation native lifecycle semantics
  readonly updateReplacePolicy?: 'Retain' | 'Delete';
}

export interface AwsInternalResource extends IirResource {
  // Layering AWS-specific synthesis metadata cleanly over the shared definition
  readonly awsMetadata?: AwsSpecificMetadata;
}

// Cloud Assembly evolves to store this rich internal IR payload[cite: 2]
export interface AwsCloudAssemblyManifest extends SharedIirManifest {
  readonly resources: AwsInternalResource[];
}
