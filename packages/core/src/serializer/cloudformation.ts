import { ArtifactType } from "../assembly/artifact";
import type { AssemblyArtifact } from "../assembly/artifact";
import type { IBackendSerializer, SerializationContext } from "./serializer";
import type { IirResourceOrComponent, Expression } from "../index";

export class CloudFormationSerializer implements IBackendSerializer {
  readonly id = 'cloudformation';
  readonly displayName = 'CloudFormation';

  serialize(context: SerializationContext): AssemblyArtifact {
    const manifest = context.manifest;

    const output: Record<string, unknown> = {
      AWSTemplateFormatVersion: '2010-09-09',
      Resources: {},
      Outputs: {},
    };

    const cfnResources: Record<string, unknown> = {};

    // Serialize only regular resources (skip components for now)
    for (const res of manifest.resources) {
      if (res.kind !== 'Resource') continue;  // Skip components

      const cfnType = this.mapResourceType(res);
      const props: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(res.properties)) {
        props[k] = this.serializeExpression(v);
      }

      const resource: Record<string, unknown> = {
        Type: cfnType,
        Properties: props,
      };

      // Serialize resource options
      if (res.options) {
        if (res.options.condition) {
          resource['Condition'] = res.options.condition;
        }

        if (res.options.dependsOn && res.options.dependsOn.length > 0) {
          resource['DependsOn'] = res.options.dependsOn;
        }

        if (res.options.retainOnDelete) {
          resource['DeletionPolicy'] = 'Retain';
        }

        if (res.options.deleteBeforeReplace) {
          resource['UpdateReplacePolicy'] = 'Delete';
        }
      }

      cfnResources[res.id] = resource;
    }

    output['Resources'] = cfnResources;

    // Serialize outputs
    const cfnOutputs: Record<string, unknown> = {};
    for (const out of manifest.outputs) {
      cfnOutputs[out.name] = {
        Value: this.serializeExpression(out.value),
        ...(out.description && { Description: out.description }),
      };
    }
    output['Outputs'] = cfnOutputs;

    return {
      id: `${this.id}-template`,
      type: ArtifactType.TEMPLATE,
      content: output,
    };
  }

  private serializeExpression(expr: Expression): any {
    switch (expr.kind) {
      case 'Literal':
        return expr.literalValue;

      case 'Reference':
        if (expr.reference.attributePath.length === 0) {
          return { Ref: expr.reference.targetResourceId };
        } else {
          return { 'Fn::GetAtt': [expr.reference.targetResourceId, ...expr.reference.attributePath] };
        }

      case 'FunctionCall':
        // Map built-in functions to CloudFormation intrinsics
        switch (expr.functionName) {
          case 'join':
            return {
              'Fn::Join': [
                this.serializeExpression(expr.arguments[0]),
                this.serializeExpression(expr.arguments[1]),
              ],
            };
          case 'split':
            return {
              'Fn::Split': [
                this.serializeExpression(expr.arguments[0]),
                this.serializeExpression(expr.arguments[1]),
              ],
            };
          case 'base64encode':
            return { 'Fn::Base64': this.serializeExpression(expr.arguments[0]) };
          default:
            // Unknown function, pass through as custom
            return {
              'Fn::Transform': {
                Name: `CustomFunction::${expr.functionName}`,
                Parameters: expr.arguments.map(a => this.serializeExpression(a)),
              },
            };
        }

      case 'Conditional':
        return {
          'Fn::If': [
            this.serializeExpression(expr.condition),
            this.serializeExpression(expr.trueValue),
            this.serializeExpression(expr.falseValue),
          ],
        };

      case 'BinaryOperation':
        // Map operators to CloudFormation intrinsics
        switch (expr.operator) {
          case '==':
            return {
              'Fn::Equals': [
                this.serializeExpression(expr.left),
                this.serializeExpression(expr.right),
              ],
            };
          case '&&':
            return {
              'Fn::And': [
                this.serializeExpression(expr.left),
                this.serializeExpression(expr.right),
              ],
            };
          case '||':
            return {
              'Fn::Or': [
                this.serializeExpression(expr.left),
                this.serializeExpression(expr.right),
              ],
            };
          default:
            throw new Error(`CloudFormation does not support binary operator: ${expr.operator}`);
        }

      case 'UnaryOperation':
        if (expr.operator === '!') {
          return { 'Fn::Not': [this.serializeExpression(expr.operand)] };
        }
        throw new Error(`CloudFormation does not support unary operator: ${expr.operator}`);

      case 'PropertyAccess':
        // Convert property access to GetAtt
        const obj = this.serializeExpression(expr.object);
        if (obj && typeof obj === 'object' && 'Fn::GetAtt' in obj) {
          const getAtt = obj['Fn::GetAtt'] as string[];
          return { 'Fn::GetAtt': [...getAtt, expr.property] };
        }
        // If object is a reference, convert to GetAtt
        if (expr.object.kind === 'Reference') {
          return {
            'Fn::GetAtt': [
              expr.object.reference.targetResourceId,
              ...expr.object.reference.attributePath,
              expr.property,
            ],
          };
        }
        throw new Error('Property access on non-reference expressions not supported in CloudFormation');

      case 'ArrayLiteral':
        return expr.elements.map(e => this.serializeExpression(e));

      case 'ObjectLiteral':
        return Object.fromEntries(
          Object.entries(expr.properties).map(([k, v]) => [k, this.serializeExpression(v)])
        );

      case 'Variable':
        // Variables become Refs in CloudFormation
        return { Ref: expr.name };

      case 'TemplateString':
        // Convert template string to Fn::Sub
        const subParts: string[] = [];
        const subVars: Record<string, any> = {};
        let varIndex = 0;

        for (const part of expr.parts) {
          if (part.type === 'literal') {
            subParts.push(part.value);
          } else {
            const varName = `Var${varIndex++}`;
            subParts.push(`\${${varName}}`);
            subVars[varName] = this.serializeExpression(part.expression);
          }
        }

        return { 'Fn::Sub': [subParts.join(''), subVars] };

      case 'IndexAccess':
        // CloudFormation has limited support for index access
        return {
          'Fn::Select': [
            this.serializeExpression(expr.index),
            this.serializeExpression(expr.collection),
          ],
        };

      case 'Invoke':
      case 'Call':
      case 'For':
        throw new Error(`CloudFormation does not support expression type: ${expr.kind}`);

      default:
        // const exhaustive: never = expr;
        throw new Error(`Unhandled expression kind: ${(expr as any).kind}`);
    }
  }

  private mapResourceType(res: IirResourceOrComponent): string {
    const { provider, service, resource } = res.resourceType;
    if (provider === 'aws') {
      // Capitalize service and resource for CloudFormation
      const svcUpper = service.charAt(0).toUpperCase() + service.slice(1);
      const resUpper = resource.charAt(0).toUpperCase() + resource.slice(1);
      return `AWS::${svcUpper}::${resUpper}`;
    }
    return `Custom::${provider}.${service}.${resource}`;
  }
}
