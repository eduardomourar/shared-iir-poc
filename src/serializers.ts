import type { AwsCloudAssemblyManifest } from './aws-internal-ir.ts';
import type { AzureAssemblyManifest } from './azure-internal-ir.ts';
import type { IirExpression } from './shared-iir.ts';

/**
 * Resolves expressions based on the target execution engine's interpolation design patterns.
 */
function resolveExpression(expr: IirExpression, target: 'CloudFormation' | 'Terraform' | 'ARM', context?: { armType?: string, apiVersion?: string }): any {
  if (expr.kind === 'Literal') {
    return expr.value;
  }
  
  if (expr.kind === 'Reference') {
    switch (target) {
      case 'CloudFormation':
        return { "Fn::GetAtt": [expr.targetResourceId, expr.attributePath.join('.')] };
      case 'Terraform':
        return `\${${context?.armType || 'azure'}.${expr.targetResourceId}.${expr.attributePath.join('_')}}`;
      case 'ARM':
        // Native ARM template string reference interpolation format
        return `[reference(resourceId('${context?.armType}', '${expr.targetResourceId}'), '${context?.apiVersion}').${expr.attributePath.join('.')}]`;
    }
  }
}

/**
 * CloudFormation Serializer (targets AWS IR Stack manifests)[cite: 2]
 */
export function serializeToCloudFormation(assembly: AwsCloudAssemblyManifest): string {
  const cfnTemplate: any = { AWSTemplateFormatVersion: '2010-09-09', Resources: {} };
  for (const res of assembly.resources) {
    const cfnType = res.kind === 'bucket' ? 'AWS::S3::Bucket' : 'AWS::CloudFormation::CustomResource';
    const processedProps: Record<string, any> = {};
    for (const [key, val] of Object.entries(res.properties)) {
      processedProps[key] = resolveExpression(val, 'CloudFormation');
    }
    cfnTemplate.Resources[res.id] = {
      Type: cfnType,
      Properties: processedProps,
      DeletionPolicy: res.awsMetadata?.deletionPolicy || 'Delete'
    };
  }
  return JSON.stringify(cfnTemplate, null, 2);
}

/**
 * ARM Template Serializer - Implements RFC-07 multi-backend compliance[cite: 2]
 */
export function serializeToArm(assembly: AzureAssemblyManifest): string {
  const armTemplate: any = {
    $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#", // Standard deployment schema
    contentVersion: "1.0.0.0",
    resources: [],
    outputs: {}
  };

  for (const res of assembly.resources) {
    // Map abstract component indicators to clear ARM namespaces
    const armType = res.kind === 'storage-account' ? 'Microsoft.Storage/storageAccounts' : 'Microsoft.Network/virtualNetworks';
    const apiVersion = res.kind === 'storage-account' ? '2023-05-01' : '2023-11-01';

    const processedProps: Record<string, any> = {};
    for (const [key, val] of Object.entries(res.properties)) {
      processedProps[key] = resolveExpression(val, 'ARM', { armType, apiVersion });
    }

    armTemplate.resources.push({
      type: armType,
      apiVersion: apiVersion,
      name: res.id,
      location: "[resourceGroup().location]", // Automatically leverage localized environment scope
      sku: res.kind === 'storage-account' ? { name: "Standard_LRS" } : undefined,
      kind: res.kind === 'storage-account' ? "StorageV2" : undefined,
      properties: processedProps,
      dependsOn: res.dependencies.length > 0 ? res.dependencies : undefined // Explicit tree resolution mapped directly[cite: 1]
    });
  }

  return JSON.stringify(armTemplate, null, 2);
}

/**
 * Enhanced Terraform Serializer - Universal translation from both AWS and Azure manifests
 */
export function serializeToTerraform(assembly: AwsCloudAssemblyManifest | AzureAssemblyManifest): string {
  const tfTemplate: any = { resource: {} };

  for (const res of assembly.resources) {
    if (res.kind === 'bucket') {
      tfTemplate.resource.aws_s3_bucket = tfTemplate.resource.aws_s3_bucket || {};
      const props: Record<string, any> = {};
      for (const [key, val] of Object.entries(res.properties)) {
        props[key === 'BucketName' ? 'bucket' : key] = resolveExpression(val, 'Terraform', { armType: 'aws_s3_bucket' });
      }
      tfTemplate.resource.aws_s3_bucket[res.id] = props;
    } 
    
    else if (res.kind === 'storage-account') {
      tfTemplate.resource.azurerm_storage_account = tfTemplate.resource.azurerm_storage_account || {};
      const props: Record<string, any> = {};
      for (const [key, val] of Object.entries(res.properties)) {
        // Map to exact azurerm TF provider attributes
        const tfKey = key === 'accountName' ? 'name' : key;
        props[tfKey] = resolveExpression(val, 'Terraform', { armType: 'azurerm_storage_account' });
      }
      // Inject standard necessary parameters for target translation engine
      tfTemplate.resource.azurerm_storage_account[res.id] = {
        ...props,
        resource_group_name: "my-default-rg",
        location: "East US",
        account_tier: "Standard",
        account_replication_type: "LRS"
      };
    }
  }

  return JSON.stringify(tfTemplate, null, 2);
}
