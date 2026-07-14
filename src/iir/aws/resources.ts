import type { IirResource } from "../shared/model.ts";
import type { AwsResourceMetadata } from "./metadata.ts";

export interface AwsResource {
  readonly shared: IirResource;
  readonly metadata?: AwsResourceMetadata;
}
