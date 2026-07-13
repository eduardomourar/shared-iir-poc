import type { AwsCloudAssemblyManifest } from './aws-internal-ir.ts';
import type { AzureAssemblyManifest } from './azure-internal-ir.ts';
import { serializeToArm, serializeToCloudFormation, serializeToTerraform } from './serializers.ts';

// ========================================================================
// AWS TEST CASE (RFC-006 Flow Validation)
// ========================================================================
const mockAwsCloudAssembly: AwsCloudAssemblyManifest = {
  resources: [
    {
      id: 'DeploymentBucket',
      kind: 'bucket',
      properties: {
        BucketName: { kind: 'Literal', value: 'my-production-assets-2026' }
      },
      dependencies: [],
      awsMetadata: {
        deletionPolicy: 'Retain' // AWS specific semantic policy flag[cite: 2]
      }
    },
    {
      id: 'ApplicationServer',
      kind: 'compute-node',
      properties: {
        SourceBucket: { 
          kind: 'Reference', 
          targetResourceId: 'DeploymentBucket', 
          attributePath: ['Arn'] 
        }
      },
      dependencies: ['DeploymentBucket'] // Dependency tracing preserved regardless of compiler output[cite: 1]
    }
  ],
  outputs: [
    {
      id: 'BucketDomainName',
      value: { kind: 'Reference', targetResourceId: 'DeploymentBucket', attributePath: ['RegionalDomainName'] }
    }
  ]
};

// ========================================================================
// AZURE TEST CASE (RFC-07 Flow Validation)
// ========================================================================
const mockAzureAssembly: AzureAssemblyManifest = {
  resources: [
    {
      id: 'PrimaryStorageAccount',
      kind: 'storage-account',
      properties: {
        accountName: { kind: 'Literal', value: 'sawebassets2026' }
      },
      dependencies: [],
      azureMetadata: { resourceGroupLookup: 'CoreNetworkRG' }
    },
    {
      id: 'AppVirtualNetwork',
      kind: 'virtual-network',
      properties: {
        // Reference property links dynamically from the storage account object metadata via the shared IIR[cite: 1, 2]
        associatedStorageBinding: { 
          kind: 'Reference', 
          targetResourceId: 'PrimaryStorageAccount', 
          attributePath: ['primaryEndpoints', 'blob'] 
        }
      },
      dependencies: ['PrimaryStorageAccount']
    }
  ],
  outputs: []
};

// --- RUN PIPELINE TRANSLATIONS ---
console.log("========================================");
console.log("EXECUTION TARGET A: AWS RUNTIME GENERATION");
console.log("========================================");
console.log(serializeToCloudFormation(mockAwsCloudAssembly));

console.log("\n========================================");
console.log("EXECUTION TARGET B: UNIVERSAL TERRAFORM COMPILED (AWS)");
console.log("========================================");
console.log(serializeToTerraform(mockAwsCloudAssembly));

console.log("\n========================================");
console.log("EXECUTION TARGET C: AZURE NATIVE ARM JSON");
console.log("========================================");
console.log(serializeToArm(mockAzureAssembly));

console.log("\n========================================");
console.log("EXECUTION TARGET D: UNIVERSAL TERRAFORM COMPILED (AZURE)");
console.log("========================================");
console.log(serializeToTerraform(mockAzureAssembly));
