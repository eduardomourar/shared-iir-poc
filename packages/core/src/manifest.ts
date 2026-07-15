import type { IirResource } from "./model";
import type { Output } from "./output";

export interface SharedIirManifest {
  readonly resources: IirResource[];
  readonly outputs: Output[];
}
