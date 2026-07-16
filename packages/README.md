# Shared IIR Packages

Synthesis-time extraction layer for Infrastructure as Code frameworks.

## Packages

### `@shared-iir/core`

Core IR model, lowering pipeline, and serializers.

**Components**:
- `IirResource`, `SharedIirManifest` - Core IR types
- `Expression` types - Property value representation (Literal, Reference, FunctionCall)
- `LoweringPipeline` - Compiler-style transformation phases
- `IBackendSerializer` - Backend code generator interface
- Built-in serializers: CloudFormation, Terraform, ARM, Mock

**Size**: ~1,150 lines

### `@shared-iir/aws-cdk`

AWS CDK extractor - walks CDK construct trees at synthesis time.

**Features**:
- `AwsCdkExtractor` - extracts CfnResources → Shared IIR
- CloudFormation type mapping
- Intrinsic function handling (Ref, Fn::GetAtt → Expression types)

**Size**: ~150 lines

## Usage

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { AwsCdkExtractor } from '@shared-iir/aws-cdk';
import { LoweringPipeline, FunctionConversionPhase, TerraformSerializer } from '@shared-iir/core';

// 1. Standard CDK code (unchanged)
const app = new App();
const stack = new Stack(app, 'MyStack');
new Bucket(stack, 'MyBucket', { versioned: true });

// 2. Extract to Shared IIR
const extractor = new AwsCdkExtractor();
const iir = extractor.extract(app);

// 3. Lower through pipeline (optional)
const pipeline = new LoweringPipeline();
pipeline.addPhase(new FunctionConversionPhase()); // Convert Fn::Join → join, etc.
const lowered = pipeline.run(iir, context);

// 4. Serialize to backend
const serializer = new TerraformSerializer();
const terraform = serializer.serialize({ assembly: lowered, target: { platform: 'aws' } });
```

## Testing

```bash
npm test
```

Tests demonstrate:
1. AWS CDK L2 → CloudFormation (standard path)
2. AWS CDK L2 → Shared IIR → CloudFormation
3. AWS CDK L2 → Shared IIR → Terraform (with function conversion)

Same L2 construct, multiple backends, no code changes.
