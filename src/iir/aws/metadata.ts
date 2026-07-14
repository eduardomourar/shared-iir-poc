export interface AwsMetadata {
  readonly deletionPolicy?: 'Delete' | 'Retain' | 'Snapshot';
  readonly updateReplacePolicy?: 'Retain' | 'Delete';
  readonly stackName?: string;
}

export interface AwsResourceMetadata {
  readonly deletionPolicy?: 'Delete' | 'Retain' | 'Snapshot';
  readonly updateReplacePolicy?: 'Retain' | 'Delete';
  readonly condition?: string;
}
