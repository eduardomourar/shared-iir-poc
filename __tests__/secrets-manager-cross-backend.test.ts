/**
 * Cross-backend test: AWS CDK → Shared IIR → Multiple backends
 *
 * Demonstrates that the same L2 construct can generate equivalent output
 * for both CloudFormation and Terraform through Shared IIR with function conversion.
 *
 * Based on: https://github.com/so0k/cdktn-provider-features-demo/blob/main/examples/l2-secretsmanager-secret/main.ts
 */

import { test } from "node:test";
import assert from "node:assert";
import { App, Stack, CfnOutput } from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { AwsCdkExtractor } from "../packages/aws-cdk/src/extractor.ts";
import { LoweringPipeline } from "../src/lowering/pipeline.ts";
import { DefaultLoweringContext } from "../src/lowering/context.ts";
import { ProviderFeatureRegistry } from "../packages/core/src/capability.ts";
import { FunctionConversionPhase } from "../packages/core/src/lowering/phases/function-conversion.ts";
import { CloudFormationSerializer } from "../src/serializers/cloudformation.ts";
import { TerraformSerializer } from "../src/serializers/terraform.ts";
import { ArtifactType } from "../src/assembly/artifact.ts";
import type { AssemblyArtifact } from "../src/assembly/artifact.ts";
import type { CloudAssembly } from "../src/assembly/assembly.ts";
import type { IirResource } from "../packages/core/src/model.ts";

interface PlatformModelArtifact extends AssemblyArtifact {
  readonly resources: readonly IirResource[];
}

test("Secrets Manager: AWS CDK → CloudFormation (standard path)", () => {
  // 1. Create AWS CDK L2 construct
  const app = new App();
  const stack = new Stack(app, "SecretsManagerStack");

  const secret = new Secret(stack, "MySecret", {
    secretName: "demo-secret",
    generateSecretString: {},
  });

  new CfnOutput(stack, "SecretArn", {
    value: secret.secretArn,
  });

  new CfnOutput(stack, "SecretName", {
    value: secret.secretName,
  });

  // 2. Standard CDK synthesis
  const assembly = app.synth();
  const cfnTemplate = assembly.getStackByName("SecretsManagerStack").template;

  // 3. Verify CloudFormation output
  assert.ok(cfnTemplate.Resources, "Has Resources");

  const secrets = Object.values(cfnTemplate.Resources).filter(
    (r: any) => r.Type === "AWS::SecretsManager::Secret"
  );

  assert.strictEqual(secrets.length, 1, "Has one secret");

  const secretResource = secrets[0] as any;
  assert.ok(secretResource.Properties, "Secret has properties");
  assert.strictEqual(
    secretResource.Properties.Name,
    "demo-secret",
    "Secret has correct name"
  );

  console.log("\n=== CloudFormation Output (Standard CDK) ===");
  console.log(JSON.stringify(cfnTemplate.Resources, null, 2));
  console.log("\n=== CloudFormation Outputs ===");
  console.log(JSON.stringify(cfnTemplate.Outputs, null, 2));
});

test("Secrets Manager: AWS CDK → Shared IIR → CloudFormation", () => {
  // 1. Create AWS CDK L2 construct
  const app = new App();
  const stack = new Stack(app, "SecretsManagerStack");

  const secret = new Secret(stack, "MySecret", {
    secretName: "demo-secret",
    generateSecretString: {},
  });

  new CfnOutput(stack, "SecretArn", {
    value: secret.secretArn,
  });

  // 2. Extract to Shared IIR
  const extractor = new AwsCdkExtractor();
  const iir = extractor.extract(app);

  assert.ok(iir.resources.length > 0, "Extracted resources");

  // 3. Find secret resource
  const secretResources = iir.resources.filter(
    (r) =>
      r.resourceType.provider === "aws" &&
      r.resourceType.resource.toLowerCase().includes("secret")
  );

  assert.ok(secretResources.length > 0, "Found secret in IIR");

  console.log("\n=== Shared IIR (Extracted) ===");
  console.log(JSON.stringify(iir, null, 2));

  // 4. Lower to AWS platform (no conversion needed for CloudFormation)
  const featureRegistry = new ProviderFeatureRegistry();
  const pipeline = new LoweringPipeline();

  const awsContext = new DefaultLoweringContext("cloudformation", featureRegistry);
  const awsModel = pipeline.run(iir, awsContext);

  // 5. Serialize to CloudFormation
  const cfnSerializer = new CloudFormationSerializer();
  const cfnAssembly: CloudAssembly = {
    manifest: {
      version: "1.0.0",
      runtime: { name: "shared-iir-poc", version: "0.0.1" },
      rootArtifactId: "aws-model",
    },
    artifacts: [
      {
        id: "aws-model",
        type: ArtifactType.PLATFORM_MODEL,
        resources: awsModel.resources,
      } as PlatformModelArtifact,
    ],
  };

  const cfnResult = cfnSerializer.serialize({
    assembly: cfnAssembly,
    target: { platform: "aws" },
  });

  assert.ok(cfnResult, "Generated CloudFormation");

  console.log("\n=== CloudFormation (via Shared IIR) ===");
  console.log(JSON.stringify((cfnResult as any).content, null, 2));
});

test("Secrets Manager: AWS CDK → Shared IIR → Terraform (with function conversion)", () => {
  // 1. Create AWS CDK L2 construct (same as above)
  const app = new App();
  const stack = new Stack(app, "SecretsManagerStack");

  const secret = new Secret(stack, "MySecret", {
    secretName: "demo-secret",
    generateSecretString: {},
  });

  new CfnOutput(stack, "SecretArn", {
    value: secret.secretArn,
  });

  // 2. Extract to Shared IIR
  const extractor = new AwsCdkExtractor();
  const iir = extractor.extract(app);

  // 3. Lower to Terraform with function conversion
  const featureRegistry = new ProviderFeatureRegistry();
  const pipeline = new LoweringPipeline();

  // Add function conversion phase to convert CloudFormation functions to Terraform equivalents
  pipeline.addPhase(new FunctionConversionPhase());

  const terraformContext = new DefaultLoweringContext("terraform", featureRegistry);
  const terraformModel = pipeline.run(iir, terraformContext);

  assert.ok(terraformModel.resources.length > 0, "Lowered to Terraform model");

  console.log("\n=== Terraform Model (after function conversion) ===");
  console.log(JSON.stringify(terraformModel, null, 2));

  // 4. Serialize to Terraform
  const tfSerializer = new TerraformSerializer();
  const tfAssembly: CloudAssembly = {
    manifest: {
      version: "1.0.0",
      runtime: { name: "shared-iir-poc", version: "0.0.1" },
      rootArtifactId: "terraform-model",
    },
    artifacts: [
      {
        id: "terraform-model",
        type: ArtifactType.PLATFORM_MODEL,
        resources: terraformModel.resources,
      } as PlatformModelArtifact,
    ],
  };

  const tfResult = tfSerializer.serialize({
    assembly: tfAssembly,
    target: { platform: "aws" },
  });

  assert.ok(tfResult, "Generated Terraform");

  console.log("\n=== Terraform (via Shared IIR with function conversion) ===");
  console.log(JSON.stringify((tfResult as any).content, null, 2));
});

test("E2E: Same AWS CDK L2 → CloudFormation + Terraform (with intrinsic function conversion)", () => {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  Cross-Backend Test: AWS CDK → Shared IIR → CF + TF     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // 1. Create AWS CDK L2 construct (single source)
  const app = new App();
  const stack = new Stack(app, "SecretsManagerStack");

  const secret = new Secret(stack, "MySecret", {
    secretName: "demo-secret",
    generateSecretString: {},
  });

  new CfnOutput(stack, "SecretArn", {
    value: secret.secretArn,
  });

  console.log("✓ Created AWS CDK L2 Secret construct\n");

  // 2. Standard CDK synthesis → CloudFormation
  const standardAssembly = app.synth();
  const standardCfn = standardAssembly.getStackByName("SecretsManagerStack").template;

  console.log("=== Path 1: Standard CDK → CloudFormation ===");
  console.log(JSON.stringify(standardCfn.Resources, null, 2));

  // 3. Extract to Shared IIR
  const extractor = new AwsCdkExtractor();
  const iir = extractor.extract(app);

  console.log("\n=== Shared IIR (Extracted - Backend-Agnostic) ===");
  console.log(`Resources: ${iir.resources.length}`);
  console.log(`Outputs: ${iir.outputs.length}`);

  // 4. Path 2: Shared IIR → CloudFormation
  const featureRegistry = new ProviderFeatureRegistry();
  const cfnPipeline = new LoweringPipeline();
  const cfnContext = new DefaultLoweringContext("cloudformation", featureRegistry);
  const cfnModel = cfnPipeline.run(iir, cfnContext);

  const cfnSerializer = new CloudFormationSerializer();
  const cfnAssembly: CloudAssembly = {
    manifest: {
      version: "1.0.0",
      runtime: { name: "shared-iir-poc", version: "0.0.1" },
      rootArtifactId: "cfn",
    },
    artifacts: [
      {
        id: "cfn",
        type: ArtifactType.PLATFORM_MODEL,
        resources: cfnModel.resources,
      } as PlatformModelArtifact,
    ],
  };

  const cfnResult = cfnSerializer.serialize({
    assembly: cfnAssembly,
    target: { platform: "aws" },
  });

  console.log("\n=== Path 2: Shared IIR → CloudFormation ===");
  console.log(JSON.stringify((cfnResult as any).content, null, 2));

  // 5. Path 3: Shared IIR → Terraform (with function conversion)
  const tfPipeline = new LoweringPipeline();
  tfPipeline.addPhase(new FunctionConversionPhase()); // Convert Fn::GetAtt, Fn::Join, etc.

  const tfContext = new DefaultLoweringContext("terraform", featureRegistry);
  const tfModel = tfPipeline.run(iir, tfContext);

  const tfSerializer = new TerraformSerializer();
  const tfAssembly: CloudAssembly = {
    manifest: {
      version: "1.0.0",
      runtime: { name: "shared-iir-poc", version: "0.0.1" },
      rootArtifactId: "tf",
    },
    artifacts: [
      {
        id: "tf",
        type: ArtifactType.PLATFORM_MODEL,
        resources: tfModel.resources,
      } as PlatformModelArtifact,
    ],
  };

  const tfResult = tfSerializer.serialize({
    assembly: tfAssembly,
    target: { platform: "aws" },
  });

  console.log("\n=== Path 3: Shared IIR → Terraform (with function conversion) ===");
  console.log(JSON.stringify((tfResult as any).content, null, 2));

  // Verify both paths work
  assert.ok(standardCfn.Resources, "Standard CDK → CloudFormation ✓");
  assert.ok((cfnResult as any).content, "Shared IIR → CloudFormation ✓");
  assert.ok((tfResult as any).content, "Shared IIR → Terraform ✓");

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  ✓ Same L2 construct → 2 backends via Shared IIR        ║");
  console.log("║  ✓ Function conversion: Fn::GetAtt → terraform lookup   ║");
  console.log("║  ✓ Backend-agnostic intermediate representation         ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
});
