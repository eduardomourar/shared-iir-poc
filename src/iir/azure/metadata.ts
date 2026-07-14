export interface AzureMetadata {
  readonly resourceGroupLookup?: string;
  readonly subscriptionId?: string;
}

export interface AzureResourceMetadata {
  readonly resourceGroup?: string;
  readonly location?: string;
}
