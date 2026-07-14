import { ArtifactType } from "../assembly/artifact.ts";
import type { AssemblyArtifact } from "../assembly/artifact.ts";
import type { IBackendSerializer, SerializationContext } from "./serializer.ts";
import { resolveExpression } from "./expression-resolver.ts";
import type { IirResource } from "../iir/shared/model.ts";
import type { Expression } from "../iir/shared/expression.ts";

/**
 * Mock serializer that produces a semantic representation of the model
 * without any deployment-engine-specific transformations.
 * Useful for validating that the Shared IIR is genuinely semantic.
 */
export class MockSerializer implements IBackendSerializer {
  readonly id = 'mock';
  readonly displayName = 'Mock';

  serialize(context: SerializationContext): AssemblyArtifact {
    const resources = this.extractResources(context);
    const output: unknown[] = [];

    for (const res of resources) {
      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(res.properties)) {
        props[k] = resolveExpression(v as Expression, 'MOCK');
      }

      output.push({
        id: res.id,
        type: {
          provider: res.resourceType.provider,
          service: res.resourceType.service,
          resource: res.resourceType.resource,
        },
        properties: props,
        capabilities: res.capabilities.map(c => c.id),
        dependencies: res.dependencies.map(d => ({ target: d.target, kind: d.kind })),
      });
    }

    return {
      id: `${this.id}-output`,
      type: ArtifactType.METADATA,
      content: { resources: output },
    };
  }

  private extractResources(context: SerializationContext): readonly IirResource[] {
    for (const artifact of context.assembly.artifacts) {
      if ('resources' in artifact) {
        return (artifact as unknown as { resources: readonly IirResource[] }).resources;
      }
    }
    return [];
  }
}
