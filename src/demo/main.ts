import type { SharedIirManifest } from "../iir/shared/manifest.ts";
import type { IirResource } from "../iir/shared/model.ts";
import { ProviderFeatureRegistry } from "../iir/shared/capability.ts";
import { ArtifactType } from "../assembly/artifact.ts";
import type { AssemblyArtifact } from "../assembly/artifact.ts";
import type { CloudAssembly } from "../assembly/assembly.ts";
import { SerializerRegistry } from "../serializers/registry.ts";
import { CloudFormationSerializer } from "../serializers/cloudformation.ts";
import { TerraformSerializer } from "../serializers/terraform.ts";
import { ArmSerializer } from "../serializers/arm.ts";
import { MockSerializer } from "../serializers/mock.ts";
import { LoweringPipeline } from "../lowering/pipeline.ts";
import { DefaultLoweringContext } from "../lowering/context.ts";
import { StorageLoweringPhase } from "../lowering/phases/storage.ts";

// ============================================================
// 1. Define a semantic Storage resource in the Shared IIR
// ============================================================

const storageResource: IirResource = {
  id: 'AppStorage',
  resourceType: {
    provider: 'generic',
    service: 'storage',
    resource: 'bucket',
  },
  properties: {
    name: { kind: 'Literal', literalValue: 'my-app-assets' },
    publicAccess: { kind: 'Literal', literalValue: false },
  },
  dependencies: [],
  capabilities: [
    { id: 'storage.versioning', required: true },
    { id: 'storage.encryption', required: true },
    { id: 'storage.lifecycle', required: false },
  ],
};

const sharedModel: SharedIirManifest = {
  resources: [storageResource],
  outputs: [
    {
      id: 'BucketName',
      value: {
        kind: 'Reference',
        reference: {
          targetResourceId: 'AppStorage',
          attributePath: ['name'],
          expectedType: 'string',
        },
      },
    },
  ],
};

// ============================================================
// 2. Setup lowering pipeline and feature registry
// ============================================================

const featureRegistry = new ProviderFeatureRegistry();
const pipeline = new LoweringPipeline();
pipeline.addPhase(new StorageLoweringPhase());

// ============================================================
// 3. Lower to AWS
// ============================================================

const awsContext = new DefaultLoweringContext('aws', featureRegistry);
const awsModel = pipeline.run(sharedModel, awsContext);

// ============================================================
// 4. Lower to Azure
// ============================================================

const azureContext = new DefaultLoweringContext('azure', featureRegistry);
const azureModel = pipeline.run(sharedModel, azureContext);

// ============================================================
// 5. Package into Cloud Assemblies
// ============================================================

interface PlatformModelArtifact extends AssemblyArtifact {
  readonly resources: readonly IirResource[];
}

const awsAssembly: CloudAssembly = {
  manifest: {
    version: '1.0.0',
    runtime: { name: 'shared-iir-poc', version: '0.0.1' },
    rootArtifactId: 'aws-platform-model',
  },
  artifacts: [
    {
      id: 'aws-platform-model',
      type: ArtifactType.PLATFORM_MODEL,
      resources: awsModel.resources,
    } as PlatformModelArtifact,
  ],
};

const azureAssembly: CloudAssembly = {
  manifest: {
    version: '1.0.0',
    runtime: { name: 'shared-iir-poc', version: '0.0.1' },
    rootArtifactId: 'azure-platform-model',
  },
  artifacts: [
    {
      id: 'azure-platform-model',
      type: ArtifactType.PLATFORM_MODEL,
      resources: azureModel.resources,
    } as PlatformModelArtifact,
  ],
};

// ============================================================
// 6. Initialize serializer registry
// ============================================================

const registry = new SerializerRegistry();
registry.register(new CloudFormationSerializer());
registry.register(new TerraformSerializer());
registry.register(new ArmSerializer());
registry.register(new MockSerializer());

// ============================================================
// 7. Serialize: Same semantic model → multiple backends
// ============================================================

const awsTarget = { platform: 'aws' };
const azureTarget = { platform: 'azure' };

console.log("================================================================");
console.log("END-TO-END: Storage Resource → CloudFormation");
console.log("================================================================");
const cfnResult = registry.get('cloudformation')!.serialize({ assembly: awsAssembly, target: awsTarget });
console.log(JSON.stringify((cfnResult as unknown as { content: unknown }).content, null, 2));

console.log("\n================================================================");
console.log("END-TO-END: Storage Resource → Terraform (AWS)");
console.log("================================================================");
const tfAwsResult = registry.get('terraform')!.serialize({ assembly: awsAssembly, target: awsTarget });
console.log(JSON.stringify((tfAwsResult as unknown as { content: unknown }).content, null, 2));

console.log("\n================================================================");
console.log("END-TO-END: Storage Resource → Terraform (Azure)");
console.log("================================================================");
const tfAzureResult = registry.get('terraform')!.serialize({ assembly: azureAssembly, target: azureTarget });
console.log(JSON.stringify((tfAzureResult as unknown as { content: unknown }).content, null, 2));

console.log("\n================================================================");
console.log("END-TO-END: Storage Resource → ARM");
console.log("================================================================");
const armResult = registry.get('arm')!.serialize({ assembly: azureAssembly, target: azureTarget });
console.log(JSON.stringify((armResult as unknown as { content: unknown }).content, null, 2));

console.log("\n================================================================");
console.log("END-TO-END: Storage Resource → Mock (Semantic Validation)");
console.log("================================================================");
const mockResult = registry.get('mock')!.serialize({ assembly: awsAssembly, target: awsTarget });
console.log(JSON.stringify((mockResult as unknown as { content: unknown }).content, null, 2));

console.log("\n================================================================");
console.log("Pipeline Diagnostics");
console.log("================================================================");
console.log("AWS lowering diagnostics:", awsContext.diagnostics);
console.log("Azure lowering diagnostics:", azureContext.diagnostics);
console.log("\nSame construct. Multiple backends. Zero code changes.");
