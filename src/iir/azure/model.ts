import type { SharedIirManifest } from "../shared/manifest.ts";
import type { AzureMetadata } from "./metadata.ts";
import type { AzureResource } from "./resources.ts";

export interface AzureInternalModel {
  readonly shared: SharedIirManifest;
  readonly metadata: AzureMetadata;
  readonly resources: AzureResource[];
}
