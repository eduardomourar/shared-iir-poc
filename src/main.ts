import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { AwsCdkExtractor } from '@shared-iir/aws-cdk';
import {
  LoweringPipeline,
  ProviderFeatureRegistry,
  FunctionConversionPhase,
  CloudFormationSerializer,
  TerraformSerializer,
} from '@shared-iir/core';

import type { ILoweringContext } from '@shared-iir/core';

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║  Shared IIR v2 Demo: AWS CDK → Multiple Backends      ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// 1. Create AWS CDK L2 construct
console.log('1. Creating AWS CDK L2 Bucket construct...');
const app = new App();
const stack = new Stack(app, 'DemoStack');
const bucket = new Bucket(stack, 'DemoBucket', {
  bucketName: 'my-demo-bucket',
  versioned: true,
});

console.log('   ✓ Bucket created\n');

// 2. Extract to Shared IIR v2
console.log('2. Extracting to Shared IIR v2...');
const extractor = new AwsCdkExtractor();
const manifest = extractor.extract(app);

console.log(`   ✓ Extracted ${manifest.resources.length} resource(s)`);
console.log(`   ✓ Manifest version: ${manifest.version}`);
console.log(`   ✓ Source: ${manifest.metadata.sourceFramework}\n`);

console.log('   Shared IIR v2 structure:');
const manifestPreview = {
  version: manifest.version,
  metadata: manifest.metadata,
  resources: manifest.resources.map(r => ({
    kind: r.kind,
    id: r.id,
    type: `${r.resourceType.provider}:${r.resourceType.service}/${r.resourceType.resource}`,
    propertyCount: Object.keys(r.properties).length,
    options: r.options,
  })),
};
console.log('   ', JSON.stringify(manifestPreview, null, 2).split('\n').join('\n    '));
console.log('');

// 3. Path A: CloudFormation (no lowering needed)
console.log('3. Serializing to CloudFormation...');

const cfnResult = new CloudFormationSerializer().serialize({
  manifest,
  assembly: {
    manifest: {
      version: '1.0.0',
      runtime: { name: 'shared-iir-demo', version: '0.0.1' },
      rootArtifactId: 'demo-stack',
    },
    artifacts: [],
  },
});

console.log('   ✓ CloudFormation template generated');
console.log('   Resources:');
const cfnContent = cfnResult.content as any;
Object.keys(cfnContent.Resources || {}).forEach(id => {
  const res = cfnContent.Resources[id];
  console.log(`     - ${id} (${res.Type})`);
});
console.log('');

// 4. Path B: Terraform (with function conversion)
console.log('4. Lowering for Terraform (function conversion)...');
const pipeline = new LoweringPipeline();
pipeline.addPhase(new FunctionConversionPhase());

const registry = new ProviderFeatureRegistry();
const context: ILoweringContext = {
  backend: 'terraform',
  features: registry,
};
const loweredManifest = pipeline.run(manifest, context);

console.log('   ✓ Lowering complete\n');

console.log('5. Serializing to Terraform...');
const tfResult = new TerraformSerializer().serialize({
  manifest: loweredManifest,
  assembly: {
    manifest: {
      version: '1.0.0',
      runtime: { name: 'shared-iir-demo', version: '0.0.1' },
      rootArtifactId: 'demo-stack',
    },
    artifacts: [],
  },
});

console.log('   ✓ Terraform configuration generated');
console.log('   Resources:');
const tfContent = tfResult.content as any;
Object.keys(tfContent.resource || {}).forEach(type => {
  Object.keys(tfContent.resource[type]).forEach(id => {
    console.log(`     - ${id} (${type})`);
  });
});
console.log('');

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║  ✓ Same CDK L2 construct → 2 backends via Shared IIR  ║');
console.log('║  ✓ v2 features: enhanced expressions, options, types  ║');
console.log('╚═══════════════════════════════════════════════════════╝');
