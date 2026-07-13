import type { GenericCloudAssembly, IirResource } from './shared-iir.ts';

export interface AzureSpecificMetadata {
  readonly resourceGroupLookup?: string;
}

export interface AzureInternalResource extends IirResource {
  readonly azureMetadata?: AzureSpecificMetadata;
}

export interface AzureCloudAssembly extends GenericCloudAssembly<AzureInternalResource> {}
