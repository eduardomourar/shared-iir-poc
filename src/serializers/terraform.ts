import { ArtifactType } from "../assembly/artifact.ts";
import type { AssemblyArtifact } from "../assembly/artifact.ts";
import type { IBackendSerializer, SerializationContext } from "./serializer.ts";
import { resolveExpression } from "./expression-resolver.ts";
import type { IirResource } from "../iir/shared/model.ts";
import type { Expression } from "../iir/shared/expression.ts";

export class TerraformSerializer implements IBackendSerializer {
  readonly id = 'terraform';
  readonly displayName = 'Terraform';

  serialize(context: SerializationContext): AssemblyArtifact {
    const resources = this.extractResources(context);
    const output: Record<string, Record<string, Record<string, unknown>>> = { resource: {} };

    for (const res of resources) {
      const tfType = this.mapResourceType(res);
      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(res.properties)) {
        props[k] = resolveExpression(v as Expression, 'TF');
      }

      if (res.conditionId) {
        props['count'] = `\${var.${res.conditionId} ? 1 : 0}`;
      }

      if (res.dependencies.length > 0) {
        props['depends_on'] = res.dependencies.map(d => d.target);
      }

      if (!output.resource[tfType]) {
        output.resource[tfType] = {};
      }
      output.resource[tfType][res.id] = props;
    }

    return {
      id: `${this.id}-configuration`,
      type: ArtifactType.TERRAFORM_CONFIGURATION,
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

  private mapResourceType(res: IirResource): string {
    const { provider, service, resource } = res.resourceType;
    const providerMap: Record<string, Record<string, string>> = {
      aws: { 's3.bucket': 'aws_s3_bucket', 'lambda.function': 'aws_lambda_function', 'iam.role': 'aws_iam_role' },
      azure: { 'storage.account': 'azurerm_storage_account', 'network.vnet': 'azurerm_virtual_network' },
    };
    return providerMap[provider]?.[`${service}.${resource}`] ?? `${provider}_${service}_${resource}`;
  }
}
