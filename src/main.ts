import type { AwsCloudAssembly } from './aws-internal-ir.ts';
import type { AzureCloudAssembly } from './azure-internal-ir.ts';
import { CloudFormationSerializer, ArmSerializer, TerraformSerializer, SerializerRegistry } from './serializers.ts';

// 1. Initialize Registry
const registry = new SerializerRegistry();
registry.register(new CloudFormationSerializer());
registry.register(new ArmSerializer());
registry.register(new TerraformSerializer());

// 2. AWS Specific Assembly Manifest (RFC-006)
const mockAwsAssembly: AwsCloudAssembly = {
  conditions: [{ id: 'IsProduction', expression: { kind: 'Literal', value: true } }],
  assets: [],
  resources: [
    {
      id: 'S3DeploymentBucket',
      resourceType: { namespace: 'aws.s3', kind: 'bucket' },
      properties: {
        BucketName: {
          kind: 'Concat',
          parts: [
            { kind: 'Literal', value: 'company-' },
            { kind: 'Conditional', conditionId: 'IsProduction', whenTrue: { kind: 'Literal', value: 'prod' }, whenFalse: { kind: 'Literal', value: 'dev' } },
            { kind: 'Literal', value: '-assets' }
          ]
        }
      },
      dependencies: [],
      awsMetadata: { deletionPolicy: 'Retain' } // Capture AWS custom policies
    }
  ],
  outputs: []
};

// 3. Azure Specific Assembly Manifest (RFC-07)
const mockAzureAssembly: AzureCloudAssembly = {
  conditions: [{ id: 'IsProduction', expression: { kind: 'Literal', value: true } }],
  assets: [],
  resources: [
    {
      id: 'PrimaryStorageAccount',
      resourceType: { namespace: 'azure.storage', kind: 'account' },
      properties: {
        accountName: { kind: 'Literal', value: 'sawebassets2026' }
      },
      dependencies: [],
      azureMetadata: { resourceGroupLookup: 'CoreNetworkRG' } // Capture Azure custom metadata
    }
  ],
  outputs: []
};

// ========================================================================
// EXECUTE TEST MATRIX (Requirement 10)
// ========================================================================

console.log("================================================================");
console.log("MATRIX 1: AWS Manifest -> CloudFormation & Terraform (Success Paths)");
console.log("================================================================");
console.log("-> TO CFN:\n", registry.get('CloudFormation')?.serialize(mockAwsAssembly));
console.log("-> TO TERRAFORM:\n", registry.get('Terraform')?.serialize(mockAwsAssembly));

console.log("\n================================================================");
console.log("MATRIX 2: Azure Manifest -> ARM & Terraform (Success Paths)");
console.log("================================================================");
console.log("-> TO ARM:\n", registry.get('ARM')?.serialize(mockAzureAssembly));
console.log("-> TO TERRAFORM:\n", registry.get('Terraform')?.serialize(mockAzureAssembly));

console.log("\n================================================================");
console.log("MATRIX 3: Cross-Compilation Warnings (No-Crash Architecture Test)");
console.log("================================================================");
console.log("-> AWS Assembly sent to ARM compiler:\n", registry.get('ARM')?.serialize(mockAwsAssembly));
console.log("-> Azure Assembly sent to CFN compiler:\n", registry.get('CloudFormation')?.serialize(mockAzureAssembly));
