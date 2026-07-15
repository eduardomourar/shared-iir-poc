import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { AwsCdkExtractor } from '@shared-iir/aws-cdk';
import {
  LoweringPipeline,
  DefaultLoweringContext,
  ProviderFeatureRegistry,
  FunctionConversionPhase,
  CloudFormationSerializer,
  TerraformSerializer
} from '@shared-iir/core';

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║  Shared IIR Demo: AWS CDK → Multiple Backends         ║');
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

// 2. Extract to Shared IIR
console.log('2. Extracting to Shared IIR...');
const extractor = new AwsCdkExtractor();
const iir = extractor.extract(app);

console.log(`   ✓ Extracted ${iir.resources.length} resource(s)\n`);
console.log('   Shared IIR structure:');
console.log('   ', JSON.stringify(iir, null, 2).split('\n').slice(0, 15).join('\n    '));
console.log('   ...\n');

// 3. Path A: CloudFormation (no lowering needed)
console.log('3. Serializing to CloudFormation...');
const cfnSerializer = new CloudFormationSerializer();
const cfnAssembly = {
  manifest: {
    version: '1.0.0',
    runtime: { name: 'shared-iir-demo', version: '0.0.1' },
    rootArtifactId: 'demo-stack',
  },
  artifacts: [
    {
      id: 'demo-stack',
      type: 'PLATFORM_MODEL' as any,
      resources: iir.resources,
    },
  ],
};

const cfnResult = cfnSerializer.serialize({
  assembly: cfnAssembly,
  target: { platform: 'aws' },
});

console.log('   CloudFormation output:');
console.log('   ', JSON.stringify((cfnResult as any).content, null, 2).split('\n').slice(0, 15).join('\n    '));
console.log('   ...\n');

// 4. Path B: Terraform (with function conversion)
console.log('4. Lowering for Terraform (function conversion)...');
const pipeline = new LoweringPipeline();
pipeline.addPhase(new FunctionConversionPhase());

const registry = new ProviderFeatureRegistry();
const tfContext = new DefaultLoweringContext('terraform', registry);
const loweredIir = pipeline.run(iir, tfContext);

console.log('   ✓ Lowering complete\n');

console.log('5. Serializing to Terraform...');
const tfSerializer = new TerraformSerializer();
const tfAssembly = {
  manifest: {
    version: '1.0.0',
    runtime: { name: 'shared-iir-demo', version: '0.0.1' },
    rootArtifactId: 'demo-stack',
  },
  artifacts: [
    {
      id: 'demo-stack',
      type: 'PLATFORM_MODEL' as any,
      resources: loweredIir.resources,
    },
  ],
};

const tfResult = tfSerializer.serialize({
  assembly: tfAssembly,
  target: { platform: 'aws' },
});

console.log('   Terraform output:');
console.log('   ', JSON.stringify((tfResult as any).content, null, 2).split('\n').slice(0, 15).join('\n    '));
console.log('   ...\n');

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║  ✓ Same CDK L2 construct → 2 backends via Shared IIR  ║');
console.log('╚═══════════════════════════════════════════════════════╝');
