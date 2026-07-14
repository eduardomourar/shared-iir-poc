import type { AssemblyArtifact } from "./artifact.ts";
import type { AssemblyManifest } from "./manifest.ts";

export interface CloudAssembly {
  readonly manifest: AssemblyManifest;
  readonly artifacts: AssemblyArtifact[];
}
