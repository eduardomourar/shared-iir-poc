import type { CloudAssembly, IirExpression, IirResource } from './shared-iir.ts';
import type { AwsInternalResource } from './aws-internal-ir.ts';
import type { AzureInternalResource } from './azure-internal-ir.ts';

export interface IBackendSerializer {
  readonly name: string;
  serialize(manifest: CloudAssembly): string;
}

/** Type guards for runtime checks (used inside serializers) */
function isAwsInternalResource(r: IirResource): r is AwsInternalResource {
  return Object.prototype.hasOwnProperty.call(r, 'awsMetadata');
}
function isAzureInternalResource(r: IirResource): r is AzureInternalResource {
  return Object.prototype.hasOwnProperty.call(r, 'azureMetadata');
}

/**
 * Universal Expression Resolver across all cloud engines
 */
function resolveExpression(expr: IirExpression, target: 'CFN' | 'TF' | 'ARM', isNestedArmExpr = false): any {
  switch (expr.kind) {
    case 'Literal':
      if (target === 'ARM' && isNestedArmExpr) {
        return typeof expr.literalValue === 'string' ? `'${expr.literalValue}'` : expr.literalValue;
      }
      return expr.literalValue;

    case 'Reference': {
      const r = expr.reference!;
      if (target === 'CFN') return { "Fn::GetAtt": [r.targetResourceId, r.attributePath.join('.')] };
      if (target === 'TF') return `\${${r.targetResourceId}.${r.attributePath.join('_')}}`;
      if (target === 'ARM') {
        const refStr = `reference(resourceId('Microsoft.Storage/storageAccounts', '${r.targetResourceId}'), '2023-05-01').${r.attributePath.join('.')}`;
        return isNestedArmExpr ? refStr : `[${refStr}]`;
      }
      break;
    }

    case 'Concat':
      if (target === 'CFN') return { "Fn::Join": ["", (expr.parts || []).map(p => resolveExpression(p, target))] };
      if (target === 'TF') return (expr.parts || []).map(p => p.kind === 'Literal' ? p.literalValue : resolveExpression(p, target)).join('');
      if (target === 'ARM') {
        const partsStr = (expr.parts || []).map(p => resolveExpression(p, target, true)).join(', ');
        const concatStr = `concat(${partsStr})`;
        return isNestedArmExpr ? concatStr : `[${concatStr}]`;
      }
      break;

    case 'Conditional':
      if (target === 'CFN') return { "Fn::If": [expr.conditionId!, resolveExpression(expr.whenTrue!, target), resolveExpression(expr.whenFalse!, target)] };
      if (target === 'TF') return `\${var.${expr.conditionId} ? ${resolveExpression(expr.whenTrue!, target)} : ${resolveExpression(expr.whenFalse!, target)}}`;
      if (target === 'ARM') {
        const condStr = `if(variables('${expr.conditionId}'), ${resolveExpression(expr.whenTrue!, target, true)}, ${resolveExpression(expr.whenFalse!, target, true)})`;
        return isNestedArmExpr ? condStr : `[${condStr}]`;
      }
      break;

    case 'List':
      return (expr.elements || []).map(e => resolveExpression(e, target, isNestedArmExpr));

    case 'Map': {
      const obj: Record<string, any> = {};
      for (const [k, v] of Object.entries(expr.fields || {})) {
        obj[k] = resolveExpression(v as IirExpression, target, isNestedArmExpr);
      }
      return obj;
    }
  }
}

/* CloudFormation, ARM and Terraform serializer implementations below are unchanged
   except their method signatures now accept CloudAssembly (non-generic). Inside
   serializers, resources can be type-guarded using the helpers above to access
   platform-specific metadata safely. */

export class CloudFormationSerializer implements IBackendSerializer {
  readonly name = 'CloudFormation';

  serialize(manifest: CloudAssembly): string {
    const output: any = { AWSTemplateFormatVersion: '2010-09-09', Conditions: {}, Resources: {}, Outputs: {} };

    manifest.conditions.forEach(c => output.Conditions[c.id] = resolveExpression(c.expression, 'CFN'));

    for (const res of manifest.resources) {
      if (res.resourceType.namespace !== 'aws.s3' && res.resourceType.namespace !== 'aws.ecr') {
        output.Resources[res.id] = {
          Type: "Custom::UnsupportedForeignResource",
          Properties: { Warning: `CloudFormation serializer cannot process namespace: ${res.resourceType.namespace}` }
        };
        continue;
      }

      const cfnType = res.resourceType.kind === 'bucket' ? 'AWS::S3::Bucket' : 'AWS::ECR::Repository';
      const props: Record<string, any> = {};
      for (const [k, v] of Object.entries(res.properties)) { props[k] = resolveExpression(v as any, 'CFN'); }

      const awsRes = isAwsInternalResource(res) ? res : undefined;
      output.Resources[res.id] = {
        Type: cfnType,
        Condition: res.conditionId,
        Properties: props,
        DeletionPolicy: awsRes?.awsMetadata?.deletionPolicy || 'Delete',
        DependsOn: res.dependencies.map((d: { target: any; }) => d.target)
      };
    }
    return JSON.stringify(output, null, 2);
  }
}

export class ArmSerializer implements IBackendSerializer {
  readonly name = 'ARM';

  serialize(manifest: CloudAssembly): string {
    const output: any = {
      $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
      contentVersion: "1.0.0.0",
      resources: [],
      outputs: {}
    };

    for (const res of manifest.resources) {
      if (res.resourceType.namespace !== 'azure.storage' && res.resourceType.namespace !== 'azure.network') {
        output.resources.push({
          type: "Microsoft.Resources/unsupportedResource",
          name: res.id,
          properties: { Warning: `ARM serializer cannot process namespace: ${res.resourceType.namespace}` }
        });
        continue;
      }

      const armType = res.resourceType.kind === 'account' ? 'Microsoft.Storage/storageAccounts' : 'Microsoft.Network/virtualNetworks';
      const apiVersion = res.resourceType.kind === 'account' ? '2023-05-01' : '2023-11-01';

      const props: Record<string, any> = {};
      for (const [k, v] of Object.entries(res.properties)) { props[k] = resolveExpression(v as any, 'ARM'); }

      const azureRes = isAzureInternalResource(res) ? res : undefined;
      const armResource: any = {
        type: armType,
        apiVersion: apiVersion,
        name: res.id,
        location: "[resourceGroup().location]",
        properties: props
      };

      if (azureRes?.azureMetadata?.resourceGroupLookup) {
        armResource.metadata = { targetResourceGroup: azureRes.azureMetadata.resourceGroupLookup };
      }

      if (res.conditionId) {
        armResource.condition = `[equals(variables('${res.conditionId}'), true())]`;
      }

      if (res.dependencies.length > 0) {
        armResource.dependsOn = res.dependencies.map((d: { target: any; }) => d.target);
      }

      output.resources.push(armResource);
    }
    return JSON.stringify(output, null, 2);
  }
}

export class TerraformSerializer implements IBackendSerializer {
  readonly name = 'Terraform';

  serialize(manifest: CloudAssembly): string {
    const output: any = { resource: {} };

    const providerMap: Record<string, string> = {
      'aws.s3.bucket': 'aws_s3_bucket',
      'azure.storage.account': 'azurerm_storage_account'
    };

    for (const res of manifest.resources) {
      const tfType = providerMap[`${res.resourceType.namespace}.${res.resourceType.kind}`];

      if (!tfType) {
        output.resource[`unsupported_${res.resourceType.namespace.replace('.', '_')}`] = {
          [res.id]: { Warning: `Terraform serializer skipped dynamic generation for type: ${res.resourceType.kind}` }
        };
        continue;
      }

      const props: Record<string, any> = {};
      for (const [k, v] of Object.entries(res.properties)) { props[k] = resolveExpression(v as any, 'TF'); }

      if (res.conditionId) {
        props['count'] = `\${var.${res.conditionId} ? 1 : 0}`;
      }

      output.resource[tfType] = output.resource[tfType] || {};
      output.resource[tfType][res.id] = props;
    }
    return JSON.stringify(output, null, 2);
  }
}

export class SerializerRegistry {
  private serializers = new Map<string, IBackendSerializer>();
  register(s: IBackendSerializer) { this.serializers.set(s.name, s); }
  get(name: string) { return this.serializers.get(name); }
}
