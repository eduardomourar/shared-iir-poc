# Architecture

Shared IIR follows a compiler-inspired pipeline architecture.

## Pipeline

```
┌─────────────────────────────────────────────────────────┐
│ 1. EXTRACTION (Frontend)                                │
│    Construct Tree → Shared IIR                          │
│    - AwsCdkExtractor: Walk CDK tree, extract resources  │
│    - Maps CloudFormation types to semantic model        │
│    - Converts intrinsics to Expression types            │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. LOWERING (Middle-end)                                │
│    Transform through compiler phases                    │
│    - FunctionConversionPhase: Fn::Join → join()         │
│    - Custom phases: optimize, validate, etc.            │
│    - Each phase: SharedIirManifest → SharedIirManifest  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. ASSEMBLY                                             │
│    Package synthesis output                             │
│    - CloudAssembly: manifest + artifacts + diagnostics  │
│    - Backend-agnostic packaging                         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. SERIALIZATION (Backend)                              │
│    Generate deployment artifacts                        │
│    - CloudFormationSerializer → CFN JSON                │
│    - TerraformSerializer → TF HCL/JSON                  │
│    - ArmSerializer → ARM JSON                           │
│    - MockSerializer → Test output                       │
└─────────────────────────────────────────────────────────┘
```

## Core Concepts

### Shared IIR (Intermediate Representation)

Backend-agnostic semantic model:

```typescript
interface SharedIirManifest {
  resources: IirResource[];      // All resources
  outputs: OutputValue[];        // Stack outputs
  dependencies: Dependency[];    // Resource dependencies
}

interface IirResource {
  id: string;                           // Unique resource ID
  resourceType: ResourceType;           // Semantic type (provider/service/resource)
  properties: Record<string, Expression>; // Property values
  dependencies: Dependency[];           // Explicit dependencies
}
```

### Expression Types

Property values represented as typed expressions:

```typescript
type Expression =
  | LiteralExpression        // Static values: "value", 123, true
  | ReferenceExpression      // Resource refs: Ref, GetAtt
  | FunctionCallExpression;  // Functions: Fn::Join, Fn::Split
```

### Lowering Pipeline

Transform IR through pluggable phases:

```typescript
interface ILoweringPhase {
  id: string;
  displayName: string;
  run(model: SharedIirManifest, context: ILoweringContext): SharedIirManifest;
}

// Example: Function conversion
class FunctionConversionPhase implements ILoweringPhase {
  run(model: SharedIirManifest, context: ILoweringContext) {
    // Convert CloudFormation functions to target backend
    // Fn::Join → join (Terraform)
    // Fn::Join → Fn::Join (CloudFormation, unchanged)
  }
}
```

### Serializers

Generate backend-specific code:

```typescript
interface IBackendSerializer {
  id: string;
  displayName: string;
  serialize(context: SerializationContext): AssemblyArtifact;
}
```

## Data Flow

### Example: S3 Bucket

```typescript
// 1. AWS CDK L2
new Bucket(stack, 'MyBucket', { versioned: true });

// 2. Extracted Shared IIR
{
  id: "MyBucket",
  resourceType: { provider: "aws", service: "storage", resource: "bucket" },
  properties: {
    versioned: { kind: "Literal", literalValue: true }
  }
}

// 3. After Lowering (if needed)
// - Function conversion applied
// - Provider-specific transformations

// 4. CloudFormation Serialization
{
  "MyBucket": {
    "Type": "AWS::S3::Bucket",
    "Properties": { "VersioningConfiguration": { "Status": "Enabled" } }
  }
}

// 5. Terraform Serialization
{
  "resource": {
    "aws_s3_bucket": {
      "MyBucket": { "versioning": { "enabled": true } }
    }
  }
}
```

## Design Principles

### 1. Separation of Concerns

Each layer has one responsibility:
- **Extraction**: Get data from construct tree
- **Lowering**: Transform data (backend-agnostic)
- **Serialization**: Generate code (backend-specific)

### 2. Backend Neutrality

Shared IIR contains no backend-specific concepts. Backend logic lives only in serializers and lowering phases.

### 3. Extensibility

Add phases and serializers without modifying core:

```typescript
// Custom phase
class MyPhase implements ILoweringPhase { /* ... */ }
pipeline.addPhase(new MyPhase());

// Custom serializer
class MySerializer implements IBackendSerializer { /* ... */ }
registry.register(new MySerializer());
```

### 4. Composition over Inheritance

Platform IR composes Shared IIR, not extends:

```typescript
interface AwsInternalIr {
  shared: SharedIirManifest;  // Wraps, not extends
  awsSpecific: /* ... */;
}
```

## Function Conversion

Automatic intrinsic function conversion when targeting different backends:

| CloudFormation | Terraform (via cfncompat) | Purpose |
|----------------|---------------------------|---------|
| `Fn::Join` | `provider::cfncompat::join` | Join array with delimiter |
| `Fn::Split` | `provider::cfncompat::split` | Split string by delimiter |
| `Fn::Select` | `provider::cfncompat::select` | Array element selection |
| `Fn::Base64` | `provider::cfncompat::base64` | Base64 encoding |
| `Fn::Sub` | `provider::cfncompat::sub` | String substitution |

See [terraform-provider-cfncompat](https://github.com/cdktn-io/terraform-provider-cfncompat) for details.

## Performance

Designed for minimal overhead:

| Operation | Time |
|-----------|------|
| Extract (1 resource) | ~1ms |
| Extract (10 resources) | ~5ms |
| Lowering (function conversion) | <1ms |
| Serialize | ~1-2ms |
| **Total (extract + lower + serialize)** | **~7-10ms** |

## Comparison with Other Approaches

### Direct Synthesis (AWS CDK → CloudFormation)

```
Construct Tree → CloudFormation
```

- ✅ Simple, direct
- ❌ Single backend only
- ❌ No reusable transformations

### Shared IIR Approach

```
Construct Tree → Shared IIR → Lowering → Serializer → Backend
```

- ✅ Multiple backends
- ✅ Reusable transformations
- ✅ Backend-agnostic analysis
- ⚠️ Slightly more complex

## Future Enhancements

1. **More lowering phases**
   - Type normalization
   - Dead code elimination
   - Resource coalescing

2. **More serializers**
   - Pulumi (Python, TypeScript, Go)
   - Ansible
   - Custom DSLs

3. **More extractors**
   - CDKTN → Shared IIR
   - cdk8s → Shared IIR
   - Pulumi → Shared IIR
