import { ArtifactType } from "../assembly/artifact";
import type { AssemblyArtifact } from "../assembly/artifact";
import type { IBackendSerializer, SerializationContext } from "./serializer";

/**
 * Mock serializer for testing - outputs JSON representation of the manifest
 */
export class MockSerializer implements IBackendSerializer {
  readonly id = 'mock';
  readonly displayName = 'Mock (JSON)';

  serialize(context: SerializationContext): AssemblyArtifact {
    return {
      id: `${this.id}-output`,
      type: ArtifactType.TEMPLATE,
      content: {
        version: context.manifest.version,
        metadata: context.manifest.metadata,
        configuration: context.manifest.configuration,
        resources: context.manifest.resources.map(r => ({
          kind: r.kind,
          id: r.id,
          type: `${r.resourceType.provider}:${r.resourceType.service}/${r.resourceType.resource}`,
          properties: r.properties,
          options: r.options,
        })),
        outputs: context.manifest.outputs,
      },
    };
  }
}
