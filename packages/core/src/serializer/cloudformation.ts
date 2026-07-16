import { ArtifactType } from "../assembly/artifact";
import type { AssemblyArtifact } from "../assembly/artifact";
import type { IBackendSerializer, SerializationContext } from "./serializer";
import { CloudFormationExpressionResolver } from "./expression-resolver";
import type { IirResource } from "../model";

export class CloudFormationSerializer implements IBackendSerializer {
  readonly id = 'cloudformation';
  readonly displayName = 'CloudFormation';

  serialize(context: SerializationContext): AssemblyArtifact {
    const resources = this.extractResources(context);
    const output: Record<string, unknown> = {
      AWSTemplateFormatVersion: '2010-09-09',
      Resources: {},
      Outputs: {},
    };

    const cfnResources: Record<string, unknown> = {};
    for (const res of resources) {
      const cfnType = this.mapResourceType(res);
      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(res.properties)) {
        props[k] = new CloudFormationExpressionResolver().resolve(v);
      }

      const resource: Record<string, unknown> = {
        Type: cfnType,
        Properties: props,
      };

      if (res.conditionId) {
        resource['Condition'] = res.conditionId;
      }

      if (res.dependencies.length > 0) {
        resource['DependsOn'] = res.dependencies.map(d => d.targetResourceId);
      }

      cfnResources[res.id] = resource;
    }

    output['Resources'] = cfnResources;

    return {
      id: `${this.id}-template`,
      type: ArtifactType.TEMPLATE,
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
    if (provider === 'aws') {
      const svcMap: Record<string, string> = {
        's3.bucket': 'AWS::S3::Bucket',
        'ecr.repository': 'AWS::ECR::Repository',
        'lambda.function': 'AWS::Lambda::Function',
        'iam.role': 'AWS::IAM::Role',
      };
      return svcMap[`${service}.${resource}`] ?? `AWS::${service.toUpperCase()}::${resource}`;
    }
    return `Custom::${provider}.${service}.${resource}`;
  }
}
