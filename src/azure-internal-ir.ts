import type { SharedIirManifest, IirResource } from './shared-iir.ts';

export interface AzureSpecificMetadata {
  readonly resourceGroupLookup?: string;
}

export interface AzureInternalResource extends IirResource {
  readonly azureMetadata?: AzureSpecificMetadata;
}

export interface AzureAssemblyManifest extends SharedIirManifest {
  readonly resources: AzureInternalResource[];
}
