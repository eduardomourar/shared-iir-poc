import type { GenericCloudAssembly, IirResource } from './shared-iir.ts';

export interface AwsSpecificMetadata {
  readonly deletionPolicy?: 'Delete' | 'Retain' | 'Snapshot';
  readonly updateReplacePolicy?: 'Retain' | 'Delete';
}

export interface AwsInternalResource extends IirResource {
  readonly awsMetadata?: AwsSpecificMetadata;
}

export interface AwsCloudAssembly extends GenericCloudAssembly<AwsInternalResource> {}
