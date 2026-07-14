import type { IirResource } from "./model.ts";
import type { Output } from "./output.ts";

export interface SharedIirManifest {
  readonly resources: IirResource[];
  readonly outputs: Output[];
}
