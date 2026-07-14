import type { SharedIirManifest } from "../shared/manifest.ts";
import type { AwsMetadata } from "./metadata.ts";
import type { AwsResource } from "./resources.ts";

export interface AwsInternalModel {
  readonly shared: SharedIirManifest;
  readonly metadata: AwsMetadata;
  readonly resources: AwsResource[];
}
