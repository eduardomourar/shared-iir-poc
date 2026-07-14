import { ArtifactType } from "../assembly/artifact.ts";
import type { AssemblyArtifact } from "../assembly/artifact.ts";
import type { IBackendSerializer, SerializationContext } from "./serializer.ts";
import { resolveExpression } from "./expression-resolver.ts";
import type { IirResource } from "../iir/shared/model.ts";
import type { Expression } from "../iir/shared/expression.ts";

export class ArmSerializer implements IBackendSerializer {
  readonly id = 'arm';
  readonly displayName = 'ARM';

  serialize(context: SerializationContext): AssemblyArtifact {
    const resources = this.extractResources(context);
    const output: Record<string, unknown> = {
      $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
      contentVersion: "1.0.0.0",
      resources: [] as unknown[],
      outputs: {},
    };

    const armResources: unknown[] = [];

    for (const res of resources) {
      const { armType, apiVersion } = this.mapResourceType(res);
      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(res.properties)) {
        props[k] = resolveExpression(v as Expression, 'ARM');
      }

      const armResource: Record<string, unknown> = {
        type: armType,
        apiVersion,
        name: res.id,
        location: "[resourceGroup().location]",
        properties: props,
      };

      if (res.conditionId) {
        armResource['condition'] = `[equals(variables('${res.conditionId}'), true())]`;
      }

      if (res.dependencies.length > 0) {
        armResource['dependsOn'] = res.dependencies.map(d => d.target);
      }

      armResources.push(armResource);
    }

    output['resources'] = armResources;

    return {
      id: `${this.id}-template`,
      type: ArtifactType.ARM_TEMPLATE,
      content: output,
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

  private mapResourceType(res: IirResource): { armType: string; apiVersion: string } {
    const { provider, service, resource } = res.resourceType;
    if (provider === 'azure') {
      const map: Record<string, { armType: string; apiVersion: string }> = {
        'storage.account': { armType: 'Microsoft.Storage/storageAccounts', apiVersion: '2023-05-01' },
        'network.vnet': { armType: 'Microsoft.Network/virtualNetworks', apiVersion: '2023-11-01' },
      };
      return map[`${service}.${resource}`] ?? { armType: `Microsoft.${service}/${resource}`, apiVersion: '2023-01-01' };
    }
    return { armType: `${provider}.${service}/${resource}`, apiVersion: '2023-01-01' };
  }
}
