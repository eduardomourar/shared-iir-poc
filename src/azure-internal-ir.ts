import type { CloudAssembly, IirResource } from './shared-iir.ts';

export interface AzureSpecificMetadata {
  readonly resourceGroupLookup?: string;
}

export interface AzureInternalResource extends IirResource {
  readonly azureMetadata?: AzureSpecificMetadata;
}

export type AzureCloudAssembly = CloudAssembly;
