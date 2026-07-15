export interface RuntimeInfo {
  readonly name: string;
  readonly version: string;
}

export interface AssemblyManifest {
  readonly version: string;
  readonly runtime: RuntimeInfo;
  readonly rootArtifactId: string;
}
