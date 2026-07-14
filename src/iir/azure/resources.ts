import type { IirResource } from "../shared/model.ts";
import type { AzureResourceMetadata } from "./metadata.ts";

export interface AzureResource {
  readonly shared: IirResource;
  readonly metadata?: AzureResourceMetadata;
}
