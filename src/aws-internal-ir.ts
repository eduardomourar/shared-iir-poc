import type { CloudAssembly, IirResource } from './shared-iir.ts';

export interface AwsSpecificMetadata {
  readonly deletionPolicy?: 'Delete' | 'Retain' | 'Snapshot';
  readonly updateReplacePolicy?: 'Retain' | 'Delete';
}

export interface AwsInternalResource extends IirResource {
  readonly awsMetadata?: AwsSpecificMetadata;
}

// Keep a non-generic alias for clarity (this is just an exported alias to CloudAssembly)
export type AwsCloudAssembly = CloudAssembly;
