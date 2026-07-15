/**
 * Integration test: S3 Bucket L2 construct → CloudFormation + Terraform
 *
 * Demonstrates thin-layer extraction from common-denominator analysis:
 * 1. Use existing AWS CDK L2 construct (no changes)
 * 2. Extract to thin IIR at synthesis time (no capabilities)
 * 3. Direct serialization (no lowering pipeline)
 * 4. Verify both outputs are valid
 */

import { test } from "node:test";
import assert from "node:assert";
import { App, Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { AwsCdkExtractor } from "../packages/aws-cdk/src/extractor.ts";

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

test("S3 Bucket L2 construct extracts to thin IIR", () => {
  // 1. Create AWS CDK L2 construct
  const app = new App();
  const stack = new Stack(app, "TestStack");
  new Bucket(stack, "MyBucket", {
    versioned: true,
  });

  // 2. Extract to thin IIR (synthesis-time hook - opt-in)
  const extractor = new AwsCdkExtractor();
  const iir = extractor.extract(app);

  // 3. Verify extraction
  assert.ok(iir.resources.length > 0, "Extracted at least one resource");

  const buckets = iir.resources.filter(r =>
    r.resourceType.provider === "aws" &&
    r.resourceType.service === "s3" &&
    r.resourceType.resource === "bucket"
  );

  assert.strictEqual(buckets.length, 1, "Found one thin IIR bucket resource");
  const bucket = buckets[0];
  assert.ok(bucket.id, "Bucket has an ID");
  assert.ok(bucket.properties, "Bucket has properties");

  // Verify no capabilities (thin layer - just data extraction)
  assert.ok(!('capabilities' in bucket), "No capabilities in thin layer");
});

test("Thin IIR extraction is fast and minimal", () => {
  // Create a larger app to test performance
  const app = new App();
  const stack = new Stack(app, "TestStack");

  // Create multiple buckets
  for (let i = 0; i < 10; i++) {
    new Bucket(stack, `Bucket${i}`, { versioned: true });
  }

  // Extract and measure
  const extractor = new AwsCdkExtractor();
  const start = Date.now();
  const iir = extractor.extract(app);
  const duration = Date.now() - start;

  // Verify extraction is fast (< 100ms for 10 resources)
  assert.ok(duration < 100, `Extraction took ${duration}ms (should be < 100ms)`);

  // Verify all buckets extracted
  const buckets = iir.resources.filter(r => r.resourceType.resource === "bucket");
  assert.strictEqual(buckets.length, 10, "Extracted all 10 buckets");

  console.log(`✓ Extracted ${buckets.length} resources in ${duration}ms`);
});

test("E2E: S3 Bucket L2 → CloudFormation (standard) + IIR (thin extraction)", () => {
  console.log("\n=== Thin Layer Integration Test ===\n");

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
  console.log(JSON.stringify(cfnTemplate.Resources, null, 2));

  // 2b. Extract to thin IIR (opt-in synthesis hook)
  const extractor = new AwsCdkExtractor();
  const thinIir = extractor.extract(app);

  console.log("\n--- Thin IIR (extracted - no capabilities) ---");
  console.log(JSON.stringify(thinIir, null, 2));

  // Verify both outputs exist
  assert.ok(cfnTemplate.Resources, "CloudFormation generated");
  assert.ok(thinIir.resources.length > 0, "Thin IIR extracted");

  // Verify thin layer has no capabilities
  const bucket = thinIir.resources.find(r => r.resourceType.resource === "bucket");
  assert.ok(bucket, "Found bucket in IIR");
  assert.ok(!('capabilities' in bucket), "Thin layer has no capabilities");

  console.log("\n✅ Same L2 construct → CloudFormation (standard) + Thin IIR (extraction)");
  console.log("✅ Thin layer: No capabilities, no semantic model - just data extraction");
});
