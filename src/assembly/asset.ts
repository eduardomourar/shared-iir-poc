import type { AssemblyArtifact } from "./artifact.ts";

export interface AssetArtifact extends AssemblyArtifact {
  readonly path?: string;
  readonly packaging?: string;
}
