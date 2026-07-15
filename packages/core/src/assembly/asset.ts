import type { AssemblyArtifact } from "./artifact";

export interface AssetArtifact extends AssemblyArtifact {
  readonly path?: string;
  readonly packaging?: string;
}
