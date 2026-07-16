import type { AssemblyArtifact } from "./artifact";
import type { AssemblyManifest } from "./manifest";

export interface CloudAssembly {
  readonly manifest: AssemblyManifest;
  readonly artifacts: AssemblyArtifact[];
}
