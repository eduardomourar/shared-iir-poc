import type { IConstruct } from "constructs";
import { CfnResource } from "aws-cdk-lib";
import type {
  IIirExtractor,
  SharedIirManifest,
  IirResource,
  Expression,
} from "@shared-iir/core";

/**
 * AWS CDK extractor - synthesis-time extraction from CDK construct trees.
 *
 * Pattern from common-denominator analysis:
 * - Walk tree at synthesis time (not construct time)
 * - Extract CfnResources → Thin IIR (no semantic capabilities)
 * - No changes to construct APIs required
 * - Opt-in, non-invasive
 */
export class AwsCdkExtractor implements IIirExtractor {
  extract(app: IConstruct): SharedIirManifest {
    const resources: IirResource[] = [];

    // Walk the construct tree and find all CfnResources
    for (const construct of app.node.findAll()) {
      if (CfnResource.isCfnResource(construct)) {
        const iirResource = this.extractCfnResource(construct);
        if (iirResource) {
          resources.push(iirResource);
        }
      }
    }

    return {
      resources,
      outputs: [], // TODO: Extract outputs from CfnOutputs
    };
  }

  private extractCfnResource(cfn: CfnResource): IirResource | undefined {
    // Map CloudFormation resource types to semantic types
    const resourceType = this.mapCfnTypeToSemantic(cfn.cfnResourceType);
    if (!resourceType) {
      return undefined;
    }

    // Extract properties from CloudFormation resource
    const properties = this.extractProperties(cfn);

    return {
      id: this.constructId(cfn),
      resourceType,
      properties,
      dependencies: [], // TODO: Extract dependencies from cfn.node.dependencies
    };
  }

  private mapCfnTypeToSemantic(cfnType: string): { provider: string; service: string; resource: string } | undefined {
    // AWS CloudFormation type format: AWS::Service::Resource
    const match = cfnType.match(/^AWS::([^:]+)::(.+)$/);
    if (!match) {
      return undefined;
    }

    const [, service, resource] = match;
    return {
      provider: 'aws',
      service: service.toLowerCase(),
      resource: resource.toLowerCase(),
    };
  }

  private extractProperties(cfn: CfnResource): Record<string, Expression> {
    const properties: Record<string, Expression> = {};

    // Access raw CloudFormation properties
    // Note: This uses private API - in production, we'd need a better approach
    const cfnProps = (cfn as any)._cfnProperties || {};

    for (const [key, value] of Object.entries(cfnProps)) {
      properties[key] = this.valueToExpression(value);
    }

    return properties;
  }

  private valueToExpression(value: any): Expression {
    if (value === null || value === undefined) {
      return { kind: 'Literal', literalValue: null };
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return { kind: 'Literal', literalValue: value };
    }

    if (Array.isArray(value)) {
      return { kind: 'Literal', literalValue: value };
    }

    if (typeof value === 'object') {
      // Check if it's a CloudFormation intrinsic function
      if ('Ref' in value) {
        return {
          kind: 'Reference',
          reference: {
            targetResourceId: value.Ref,
            attributePath: [],
            expectedType: 'string',
          },
        };
      }

      if ('Fn::GetAtt' in value) {
        const [resourceId, ...attributePath] = value['Fn::GetAtt'];
        return {
          kind: 'Reference',
          reference: {
            targetResourceId: resourceId,
            attributePath: attributePath.map(String),
            expectedType: 'string',
          },
        };
      }
    }

    return { kind: 'Literal', literalValue: value };
  }

  private constructId(construct: IConstruct): string {
    // Use the full path as the ID
    return construct.node.path || construct.node.id;
  }
}
