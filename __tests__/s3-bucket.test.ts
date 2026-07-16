/**
 * Integration test: S3 Bucket L2 construct → CloudFormation + Terraform
 *
 * Demonstrates thin-layer extraction from common-denominator analysis:
 * 1. Use existing AWS CDK L2 construct (no changes)
 * 2. Extract to Shared IIR at synthesis time
 * 3. Serialize to both CloudFormation and Terraform
 * 4. Verify both outputs are valid
 */

import { test } from "node:test";
import assert from "node:assert";
import { App, Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { AwsCdkExtractor } from "../packages/aws-cdk/src/extractor.ts";
import { SerializerRegistry } from "../src/serializers/registry.ts";
import { CloudFormationSerializer } from "../src/serializers/cloudformation.ts";
import { TerraformSerializer } from "../src/serializers/terraform.ts";
import { LoweringPipeline } from "../src/lowering/pipeline.ts";
import { DefaultLoweringContext } from "../src/lowering/context.ts";
import { ProviderFeatureRegistry } from "../src/iir/shared/capability.ts";
import { ArtifactType } from "../src/assembly/artifact.ts";
import type { AssemblyArtifact } from "../src/assembly/artifact.ts";
import type { CloudAssembly } from "../src/assembly/assembly.ts";
import type { IirResource } from "../src/iir/shared/model.ts";

interface PlatformModelArtifact extends AssemblyArtifact {
  readonly resources: readonly IirResource[];
}

test("S3 Bucket L2 construct extracts and serializes to CloudFormation", () => {
  // 1. Create AWS CDK L2 construct (standard user code - unchanged)
  const app = new App();
  const stack = new Stack(app, "TestStack");
  new Bucket(stack, "MyBucket", {
    versioned: true,
  });

  // 2. Standard CDK synthesis (produces CloudFormation)
  const assembly = app.synth();
  const cfnTemplate = assembly.getStackByName("TestStack").template;

  // Verify CloudFormation has S3 bucket
  assert.ok(cfnTemplate.Resources, "CloudFormation template has Resources");
  const bucketResources = Object.values(cfnTemplate.Resources).filter(
    (r: any) => r.Type === "AWS::S3::Bucket"
  );
  assert.strictEqual(bucketResources.length, 1, "Found one S3 bucket in CloudFormation");
  const cfnBucket = bucketResources[0] as any;
  assert.ok(cfnBucket.Properties?.VersioningConfiguration, "Bucket has versioning configured");
});

test("S3 Bucket L2 construct extracts to Shared IIR", () => {
  // 1. Create AWS CDK L2 construct
  const app = new App();
  const stack = new Stack(app, "TestStack");
  new Bucket(stack, "MyBucket", {
    versioned: true,
  });

  // 2. Extract to Shared IIR (synthesis-time hook - opt-in)
  const extractor = new AwsCdkExtractor();
  const iir = extractor.extract(app);

  // 3. Verify extraction
  assert.ok(iir.resources.length > 0, "Extracted at least one resource");

  const buckets = iir.resources.filter(r =>
    r.resourceType.provider === "aws" &&
    r.resourceType.service === "s3" &&
    r.resourceType.resource === "bucket"
  );

  assert.strictEqual(buckets.length, 1, "Found one semantic bucket resource");
  const bucket = buckets[0];
  assert.ok(bucket.id, "Bucket has an ID");
  assert.ok(bucket.properties, "Bucket has properties");
});

test("S3 Bucket extracts to Shared IIR and serializes to Terraform", async () => {
  // 1. Create AWS CDK L2 construct
  const app = new App();
  const stack = new Stack(app, "TestStack");
  new Bucket(stack, "MyBucket", {
    versioned: true,
  });

  // 2. Extract to Shared IIR
  const extractor = new AwsCdkExtractor();
  const sharedIir = extractor.extract(app);

  assert.ok(sharedIir.resources.length > 0, "Extracted resources");

  // 3. Lower to AWS platform IR
  const featureRegistry = new ProviderFeatureRegistry();
  const pipeline = new LoweringPipeline();
  // Note: No storage lowering phase needed for this test as we're working with AWS resources directly

  const awsContext = new DefaultLoweringContext("aws", featureRegistry);
  const awsModel = pipeline.run(sharedIir, awsContext);

  // 4. Package into Cloud Assembly
  const awsAssembly: CloudAssembly = {
    manifest: {
      version: "1.0.0",
      runtime: { name: "shared-iir-poc", version: "0.0.1" },
      rootArtifactId: "aws-platform-model",
    },
    artifacts: [
      {
        id: "aws-platform-model",
        type: ArtifactType.PLATFORM_MODEL,
        resources: awsModel.resources,
      } as PlatformModelArtifact,
    ],
  };

  // 5. Serialize to Terraform
  const registry = new SerializerRegistry();
  registry.register(new TerraformSerializer());

  const tfResult = registry.get("terraform")!.serialize({
    assembly: awsAssembly,
    target: { platform: "aws" },
  });

  // 6. Verify Terraform output
  const tfContent = (tfResult as any).content;
  assert.ok(tfContent, "Terraform content generated");
  assert.ok(tfContent.resource, "Terraform has resources");

  console.log("\n=== Generated Terraform ===");
  console.log(JSON.stringify(tfContent, null, 2));
});

test("E2E: S3 Bucket L2 → CloudFormation + Terraform", async () => {
  console.log("\n=== Integration Test: AWS CDK L2 Bucket → CloudFormation + Terraform ===\n");

  // 1. Create AWS CDK L2 construct (standard user code)
  const app = new App();
  const stack = new Stack(app, "TestStack");
  new Bucket(stack, "MyBucket", {
    versioned: true,
  });

  // 2a. Standard CDK synthesis → CloudFormation
  const assembly = app.synth();
  const cfnTemplate = assembly.getStackByName("TestStack").template;

  console.log("--- CloudFormation (via standard CDK synthesis) ---");
  console.log(JSON.stringify(cfnTemplate, null, 2));

  // 2b. Extract to Shared IIR (opt-in synthesis hook)
  const extractor = new AwsCdkExtractor();
  const sharedIir = extractor.extract(app);

  console.log("\n--- Shared IIR (extracted) ---");
  console.log(JSON.stringify(sharedIir, null, 2));

  // 3. Lower to AWS platform IR
  const featureRegistry = new ProviderFeatureRegistry();
  const pipeline = new LoweringPipeline();
  const awsContext = new DefaultLoweringContext("aws", featureRegistry);
  const awsModel = pipeline.run(sharedIir, awsContext);

  // 4. Package into Cloud Assembly
  const awsAssembly: CloudAssembly = {
    manifest: {
      version: "1.0.0",
      runtime: { name: "shared-iir-poc", version: "0.0.1" },
      rootArtifactId: "aws-platform-model",
    },
    artifacts: [
      {
        id: "aws-platform-model",
        type: ArtifactType.PLATFORM_MODEL,
        resources: awsModel.resources,
      } as PlatformModelArtifact,
    ],
  };

  // 5. Serialize to both backends
  const registry = new SerializerRegistry();
  registry.register(new CloudFormationSerializer());
  registry.register(new TerraformSerializer());

  const cfnResult = registry.get("cloudformation")!.serialize({
    assembly: awsAssembly,
    target: { platform: "aws" },
  });

  const tfResult = registry.get("terraform")!.serialize({
    assembly: awsAssembly,
    target: { platform: "aws" },
  });

  console.log("\n--- CloudFormation (via Shared IIR) ---");
  console.log(JSON.stringify((cfnResult as any).content, null, 2));

  console.log("\n--- Terraform (via Shared IIR) ---");
  console.log(JSON.stringify((tfResult as any).content, null, 2));

  // Verify both outputs exist
  assert.ok((cfnResult as any).content, "CloudFormation generated via IIR");
  assert.ok((tfResult as any).content, "Terraform generated via IIR");

  console.log("\n✅ Same L2 construct → Multiple backends via thin synthesis-time extraction");
});
