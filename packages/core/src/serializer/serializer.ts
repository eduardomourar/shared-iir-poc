import type { CloudAssembly } from "../assembly/assembly";
import type { AssemblyArtifact } from "../assembly/artifact";
import type { SharedIirManifest } from "../manifest";

/**
 * Backend serializer - converts Shared IIR to deployment artifacts
 */
export interface IBackendSerializer {
  readonly id: string;
  readonly displayName: string;

  /**
   * Serialize the Shared IIR manifest to backend-specific artifacts
   */
  serialize(context: SerializationContext): AssemblyArtifact;
}

/**
 * Context passed to serializers
 */
export interface SerializationContext {
  readonly manifest: SharedIirManifest;
  readonly assembly: CloudAssembly;
}
