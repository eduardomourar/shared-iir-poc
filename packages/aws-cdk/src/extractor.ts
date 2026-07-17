import type { IConstruct } from "constructs";
import { CfnResource } from "aws-cdk-lib";
import type {
  IIirExtractor,
  SharedIirManifest,
  IirResource,
  IirResourceOrComponent,
  Expression,
  ResourceOptions,
  OutputValue,
} from "@shared-iir/core";
import { literal } from "@shared-iir/core";

/**
 * AWS CDK extractor - synthesis-time extraction from CDK construct trees.
 *
 * Extracts Shared IIR from AWS CDK L1 (CfnXxx) resources with:
 * - Enhanced resource options (parent, dependencies, conditions, lifecycle)
 * - Scoping and variable tracking
 * - Output extraction
 * - Component detection (future: L2/L3 constructs as components)
 */
export class AwsCdkExtractor implements IIirExtractor {
  extract(app: IConstruct): SharedIirManifest {
    const rootScope = {
      id: 'program',
      kind: 'program' as const,
      variables: new Map(),
      children: [],
    };

    // Extract resources with enhanced options
    const resources: IirResourceOrComponent[] = [];

    for (const construct of app.node.findAll()) {
      if (CfnResource.isCfnResource(construct)) {
        const iirResource = this.extractCfnResource(construct);
        if (iirResource) {
          resources.push(iirResource);
        }
      }
    }

    // Extract outputs (look for CfnOutput constructs)
    const outputs = this.extractOutputs(app);

    return {
      version: '2.0.0',
      metadata: {
        name: app.node.id || 'CDKApp',
        sourceFramework: 'aws-cdk',
      },
      configuration: [],  // CDK doesn't have explicit config, could extract from context
      resources,
      outputs,
      rootScope,
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

    // Extract resource options
    const options = this.extractResourceOptions(cfn);

    return {
      kind: 'Resource',
      id: this.constructId(cfn),
      resourceType,
      properties,
      options,
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
      return literal(null);
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return literal(value);
    }

    if (Array.isArray(value)) {
      return {
        kind: 'ArrayLiteral',
        elements: value.map(v => this.valueToExpression(v)),
      };
    }

    if (typeof value === 'object') {
      // Check if it's a CloudFormation intrinsic function
      if ('Ref' in value) {
        return {
          kind: 'Reference',
          reference: {
            targetResourceId: value.Ref,
            attributePath: [],
          },
        };
      }

      if ('Fn::GetAtt' in value) {
        const getAtt = value['Fn::GetAtt'];
        if (Array.isArray(getAtt) && getAtt.length >= 2) {
          const [resourceId, ...attributePath] = getAtt;
          return {
            kind: 'Reference',
            reference: {
              targetResourceId: resourceId,
              attributePath: attributePath.map(String),
            },
          };
        }
      }

      if ('Fn::Join' in value) {
        const [separator, items] = value['Fn::Join'];
        return {
          kind: 'FunctionCall',
          functionName: 'join',
          arguments: [
            this.valueToExpression(separator),
            this.valueToExpression(items),
          ],
        };
      }

      if ('Fn::If' in value) {
        const [condition, trueValue, falseValue] = value['Fn::If'];
        return {
          kind: 'Conditional',
          condition: { kind: 'Variable', name: condition },
          trueValue: this.valueToExpression(trueValue),
          falseValue: this.valueToExpression(falseValue),
        };
      }

      // Object literal
      return {
        kind: 'ObjectLiteral',
        properties: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, this.valueToExpression(v)])
        ),
      };
    }

    return literal(value);
  }

  private extractResourceOptions(cfn: CfnResource): ResourceOptions {
    const cfnOptions = (cfn as any).cfnOptions;
    const deps = cfn.node.dependencies;

    return {
      ...(cfnOptions?.condition && { condition: cfnOptions.condition }),
      ...(deps.length > 0 && { dependsOn: deps.map((d: any) => d.node.path || d.node.id) }),
      ...(cfn.node.scope && cfn.node.scope !== cfn && {
        parent: cfn.node.scope.node.path || cfn.node.scope.node.id
      }),
      ...(cfnOptions?.deletionPolicy === 'Retain' && { retainOnDelete: true }),
      ...(cfnOptions?.updateReplacePolicy === 'Delete' && { deleteBeforeReplace: true }),
    };
  }

  private extractOutputs(app: IConstruct): OutputValue[] {
    const outputs: OutputValue[] = [];

    // Look for CfnOutput constructs
    for (const construct of app.node.findAll()) {
      if (construct.constructor.name === 'CfnOutput') {
        const cfnOutput = construct as any;
        outputs.push({
          name: construct.node.id,
          value: this.valueToExpression(cfnOutput.value),
          ...(cfnOutput.description && { description: cfnOutput.description }),
        });
      }
    }

    return outputs;
  }

  private constructId(construct: IConstruct): string {
    // Use the full path as the ID
    return construct.node.path || construct.node.id;
  }
}
