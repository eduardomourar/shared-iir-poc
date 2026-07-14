import type { AssemblyArtifact } from "../assembly/artifact.ts";
import type { CloudAssembly } from "../assembly/assembly.ts";

export interface BackendTarget {
  readonly platform: string;
  readonly version?: string;
}

export interface SerializationOptions {
  readonly pretty?: boolean;
  readonly strict?: boolean;
}

export interface SerializationContext {
  readonly assembly: CloudAssembly;
  readonly target: BackendTarget;
  readonly options?: SerializationOptions;
}

export interface IBackendSerializer {
  readonly id: string;
  readonly displayName: string;

  serialize(context: SerializationContext): AssemblyArtifact;
}
