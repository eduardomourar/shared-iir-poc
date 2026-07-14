# Shared Concepts with cdk2pulumi

This document explores the architectural similarities and complementary design patterns between the Shared IIR project and the [cdk2pulumi](https://github.com/pulumi/pulumi-tool-cdk2pulumi/) project.

## Overview

Both projects address the challenge of **multi-backend infrastructure synthesis** through intermediate representation architectures, though they approach the problem from different angles:

```
cdk2pulumi:        CDK CloudAssembly → [Translation] → Pulumi Program
shared-iir-poc:    CDK Constructs → [Shared IIR] → CloudFormation/Terraform/ARM
```

While cdk2pulumi focuses on **runtime translation** (interpreting CloudFormation templates as Pulumi resources at deployment time), shared-iir-poc focuses on **compile-time transformation** (lowering semantic models through a compiler pipeline before generating deployment artifacts).

---

## Core Architectural Similarities

### 1. CloudAssembly as Translation Input

Both projects consume the **AWS CDK CloudAssembly** format as a standard interchange format.

**cdk2pulumi**:
- Reads `manifest.json` from CDK synthesis output
- Parses CloudFormation templates embedded in the assembly
- Translates CloudFormation resources into Pulumi SDK calls at runtime
- Preserves asset references, metadata, and stack dependencies

**shared-iir-poc** (see `src/assembly/`):
```typescript
export interface CloudAssembly {
  readonly manifest: AssemblyManifest;
  readonly artifacts: AssemblyArtifact[];
}

export interface AssemblyManifest {
  readonly version: string;
  readonly runtime: RuntimeInfo;
  readonly rootArtifactId: string;
}
```
- Packages semantic models into CloudAssembly-compatible structure
- Contains deployment artifacts, diagnostics, metadata, assets
- Mirrors AWS CDK CloudAssembly responsibilities while remaining backend-neutral
- Serializers consume CloudAssembly to generate deployment artifacts

**Shared Principle**: CloudAssembly is the standard packaging format for synthesized infrastructure

---

### 2. Multi-Backend Synthesis Architecture

Both projects enable a **single construct tree to target multiple deployment engines**.

**cdk2pulumi**:
- CDK constructs → CloudFormation (via CDK synthesis) → Pulumi resources
- Supports Pulumi's multi-cloud providers (AWS, Azure, GCP, Kubernetes)
- Runtime interpretation: CloudFormation template executed as Pulumi program
- Example: `AWS::S3::Bucket` → `aws.s3.Bucket` Pulumi resource

**shared-iir-poc** (see `src/serializers/`):
- CDK constructs → Shared IIR → Platform IR → Multiple backends
- Serializer registry supports pluggable backends:
  - CloudFormation serializer (see `src/serializers/cloudformation.ts:8-75`)
  - Terraform serializer (see `src/serializers/terraform.ts:8-61`)
  - ARM serializer
  - Mock serializer (for testing)
- Compile-time transformation: IR lowered through phases before serialization
- Example: Generic `storage.bucket` → `AWS::S3::Bucket` (CFN) or `aws_s3_bucket` (Terraform)

**Key Difference**:
- **cdk2pulumi**: Runtime interpretation (CloudFormation → Pulumi state)
- **shared-iir-poc**: Compile-time generation (IR → deployment artifacts)

**Shared Vision**: One construct tree, multiple deployment backends

---

### 3. Template-to-Native-Resource Translation

Both projects transform template-based resource definitions into target backend representations.

**cdk2pulumi**:
- Parses CloudFormation templates (JSON/YAML)
- Maps CloudFormation resource types to Pulumi resource types
  - `AWS::S3::Bucket` → `aws.s3.Bucket`
  - `AWS::Lambda::Function` → `aws.lambda.Function`
- Translates CloudFormation properties to Pulumi input properties
- Handles provider-specific naming conventions and property structures

**shared-iir-poc** (see `src/serializers/cloudformation.ts:62-74`, `terraform.ts:53-60`):
```typescript
private mapResourceType(res: IirResource): string {
  const { provider, service, resource } = res.resourceType;
  if (provider === 'aws') {
    const svcMap: Record<string, string> = {
      's3.bucket': 'AWS::S3::Bucket',
      'lambda.function': 'AWS::Lambda::Function',
      'iam.role': 'AWS::IAM::Role',
    };
    return svcMap[`${service}.${resource}`] ?? `AWS::${service}::${resource}`;
  }
  return `Custom::${provider}.${service}.${resource}`;
}
```
- Maps semantic resource types (`generic.storage.bucket`) to backend-specific types
- Terraform: `aws_s3_bucket`, `azurerm_storage_account`
- CloudFormation: `AWS::S3::Bucket`
- ARM: `Microsoft.Storage/storageAccounts`

**Shared Challenge**: Maintain semantic equivalence across provider type systems with different naming conventions and property schemas

---

### 4. Intrinsic Function and Reference Translation

Both projects must preserve cross-resource references and dynamic expressions across translation boundaries.

**cdk2pulumi**:
- Translates CloudFormation intrinsic functions to Pulumi equivalents:
  - `Ref` → `.id` or `.name` property access
  - `Fn::GetAtt` → `.arn`, `.name`, or other output properties
  - `Fn::Sub` → Pulumi string interpolation
  - `Fn::Join` → string concatenation
  - `Fn::If` → Pulumi conditional expressions
- Preserves output dependencies for correct resource ordering
- Handles cross-stack references

**shared-iir-poc** (see `src/iir/shared/expression.ts`):
```typescript
export interface Expression {
  readonly kind: 'Literal' | 'Reference' | 'Concat' | 'Conditional' | 
                 'List' | 'Map' | 'Binary' | 'FunctionCall' | 'Object';
  
  // Reference
  readonly reference?: Reference;  // Cross-resource attribute references
  
  // Conditional
  readonly conditionId?: string;
  readonly whenTrue?: Expression;
  readonly whenFalse?: Expression;
  
  // FunctionCall
  readonly functionRef?: SemanticFunction;
  readonly arguments?: Expression[];
}
```
- Expression resolver translates to backend-specific syntax:
  - CloudFormation: `{"Ref": "BucketName"}`, `{"Fn::GetAtt": ["Bucket", "Arn"]}`
  - Terraform: `${aws_s3_bucket.example.id}`, `${var.bucket_name}`
  - Pulumi: Would translate to resource property access (if integrated)

**Shared Principle**: Abstract syntax tree for expressions enables backend-agnostic reference modeling

---

### 5. Dependency Graph Preservation

Both projects must maintain correct resource ordering and dependency relationships.

**cdk2pulumi**:
- Infers dependencies from CloudFormation:
  - Explicit: `DependsOn` declarations
  - Implicit: `Ref` and `Fn::GetAtt` references
- Translates to Pulumi's automatic dependency tracking
- Pulumi engine uses Output<T> types for dependency chaining

**shared-iir-poc** (see `src/iir/shared/model.ts:11-18`):
```typescript
export interface IirResource {
  readonly id: string;
  readonly resourceType: ResourceType;
  readonly properties: Record<string, Expression>;
  readonly dependencies: Dependency[];  // Explicit dependency tracking
  readonly conditionId?: string;
  readonly capabilities: SemanticCapability[];
}
```
- Explicit `dependencies` array in resource model
- Serializers translate to backend-specific constructs:
  - CloudFormation: `DependsOn` property (line 38 in cloudformation.ts)
  - Terraform: `depends_on` or implicit reference dependencies (line 28 in terraform.ts)
  - Pulumi: Would use automatic dependency inference from resource references

**Shared Challenge**: Preserve topological ordering while adapting to different dependency expression mechanisms

---

### 6. Semantic Capability Resolution

Both projects face the challenge of mapping high-level infrastructure intents to provider-specific implementations.

**cdk2pulumi**:
- Translates CDK L2 construct abstractions (implicit in CloudFormation output)
- Maps CloudFormation resource properties to Pulumi provider schemas
- Example: CDK `Bucket.withVersioning()` → CloudFormation `VersioningConfiguration` → Pulumi `versioning` block
- Provider schema validation at runtime

**shared-iir-poc** (see `src/iir/shared/capability.ts`, `src/lowering/phases/storage.ts:31-126`):
```typescript
export interface SemanticCapability {
  readonly id: string;      // e.g., 'storage.versioning', 'storage.encryption'
  readonly required: boolean;
}

export class ProviderFeatureRegistry {
  resolve(providerId: string, capability: SemanticCapability, 
          resource: ResourceDescriptor): CapabilityResolution;
}
```
- Lowering phases expand semantic capabilities into provider properties:
  - `storage.versioning` (AWS) → `VersioningConfiguration: { Status: 'Enabled' }` (line 38-44)
  - `storage.versioning` (Azure) → `isVersioningEnabled: true` (line 46)
  - `storage.encryption` (AWS) → `BucketEncryption` with SSE config (line 53-72)
  - `storage.encryption` (Azure) → `encryption.services.blob.enabled` (line 74-90)
- Compile-time validation and expansion

**Shared Principle**: Abstract capability declarations map to concrete provider features

---

## Architectural Differences

### Runtime vs. Compile-Time Translation

**cdk2pulumi** (Runtime Interpretation):
- **When**: During `pulumi up` deployment
- **How**: Pulumi engine interprets CloudFormation templates as Pulumi resource operations
- **State**: Pulumi manages state, tracks drift, plans updates
- **Flexibility**: Can use Pulumi-specific features (secrets, stack references, policy-as-code)
- **Trade-off**: Requires Pulumi runtime; CloudFormation semantics executed through Pulumi engine

**shared-iir-poc** (Compile-Time Generation):
- **When**: During construct synthesis (before deployment)
- **How**: Lowering pipeline transforms semantic IR into deployment artifacts (JSON/HCL)
- **State**: Backend-native state management (CloudFormation stacks, Terraform state, etc.)
- **Flexibility**: Pure artifact generation; no runtime dependencies
- **Trade-off**: Generated artifacts are "final"; no runtime semantic model available

### Transformation Pipeline Depth

**cdk2pulumi**:
- Two-stage: CDK → CloudFormation (via CDK) → Pulumi (via cdk2pulumi)
- CloudFormation acts as intermediate format
- Limited semantic information available (CloudFormation is already "lowered")

**shared-iir-poc**:
- Multi-stage compiler pipeline:
  1. **Shared IIR**: Cloud-neutral semantic model
  2. **Lowering phases**: Feature expansion, validation, optimization
  3. **Platform IR**: Provider-specific but backend-neutral (AWS IR, Azure IR)
  4. **Serialization**: Backend-specific artifact generation
- Rich semantic model available throughout pipeline
- Each phase is independently testable and composable

### State Management Philosophy

**cdk2pulumi**:
- **Pulumi-managed state**: Single source of truth in Pulumi backend
- **Unified state model**: All resources tracked through Pulumi, regardless of origin
- **Import workflow**: Can import existing CloudFormation stacks into Pulumi state

**shared-iir-poc**:
- **Backend-native state**: CloudFormation stack state, Terraform `.tfstate`, ARM deployment state
- **Multiple state backends**: Each serializer produces artifacts for native state management
- **No state abstraction**: Relies on deployment engine's native state mechanism

---

## Integration Opportunities

### 1. Pulumi as a Serialization Target

shared-iir-poc could add a **Pulumi serializer** that generates Pulumi programs:

```typescript
export class PulumiSerializer implements IBackendSerializer {
  readonly id = 'pulumi';
  readonly displayName = 'Pulumi';

  serialize(context: SerializationContext): AssemblyArtifact {
    // Generate Pulumi TypeScript/Python/Go program
    // Map IirResource → new aws.s3.Bucket(...) etc.
    // Use expression visitor to generate property values
  }
}
```

Pipeline would become:
```
Constructs → Shared IIR → Lowering → Platform IR → Pulumi Serializer → Pulumi Program
```

Benefits over cdk2pulumi:
- **Richer semantic model**: Access to pre-lowering capabilities and constraints
- **Multi-cloud from IR**: Same semantic model → AWS Pulumi or Azure Pulumi
- **Optimization opportunities**: Pulumi-specific optimizations in lowering phases

### 2. Reverse Translation: Pulumi → Shared IIR

A Pulumi-to-IIR converter could enable bidirectional workflows:

```
Pulumi Program → [Parser] → Shared IIR → [Serializer] → CloudFormation/Terraform
```

Use cases:
- Migrate Pulumi projects to other backends
- Generate CloudFormation from Pulumi for AWS-native deployments
- Cross-tool interoperability

### 3. CloudAssembly Standardization

Both projects could benefit from **extended CloudAssembly format**:

Current CloudAssembly (AWS CDK):
- Contains CloudFormation templates
- Asset manifests
- Tree metadata
- Stack dependencies

Enhanced CloudAssembly:
- **Semantic IR artifact**: Include Shared IIR alongside CloudFormation
- **Capability metadata**: Document semantic capabilities used
- **Lowering diagnostics**: Validation/optimization results
- **Multi-backend artifacts**: CloudFormation, Terraform, Pulumi in same assembly

cdk2pulumi could consume semantic IR for better translation:
```
CloudAssembly (with Shared IIR) → cdk2pulumi → Pulumi (with semantic awareness)
```

### 4. Unified Expression Model

Both projects handle intrinsic functions; a shared expression library could:
- Define common AST nodes (Reference, Conditional, FunctionCall)
- Provide visitor implementations for each backend
- Enable expression optimization passes
- Support cross-backend expression validation

Example shared library:
```typescript
import { Expression, IExpressionVisitor } from '@shared-iir/expressions';

// cdk2pulumi visitor
class PulumiExpressionVisitor implements IExpressionVisitor {
  visitReference(expr: Expression): pulumi.Output<string> { ... }
  visitConditional(expr: Expression): pulumi.Output<any> { ... }
}

// shared-iir-poc already has this (src/iir/shared/expression.ts:75-102)
```

---

## Deployment Model Comparison

### cdk2pulumi Deployment Flow

```
Developer writes CDK constructs (TypeScript/Python/etc.)
          ↓
    cdk synth → CloudAssembly (CloudFormation templates)
          ↓
    pulumi up (with cdk2pulumi)
          ↓
  cdk2pulumi interprets CloudFormation as Pulumi resources
          ↓
    Pulumi engine deploys resources to cloud provider
          ↓
    Pulumi state stores resource metadata
```

**Characteristics**:
- Runtime interpretation at deployment time
- Pulumi engine orchestrates deployment
- CloudFormation templates are "source code" for Pulumi
- State managed in Pulumi backend

### shared-iir-poc Deployment Flow

```
Developer writes CDK constructs (TypeScript/Python/etc.)
          ↓
    Synthesis → Shared IIR (semantic model)
          ↓
    Lowering pipeline (feature expansion, validation)
          ↓
    Platform IR (AWS IR / Azure IR)
          ↓
    Cloud Assembly packaging
          ↓
    Serializer registry → Choose backend
          ↓
  CloudFormation: aws cloudformation deploy
  Terraform: terraform apply
  ARM: az deployment create
          ↓
    Backend-native state management
```

**Characteristics**:
- Compile-time generation before deployment
- Backend-native deployment tools
- Deployment artifacts are final (JSON/HCL)
- State managed by deployment engine

---

## Expression Translation Examples

### CloudFormation Intrinsic → Target Backend

**Source (CloudFormation)**:
```json
{
  "BucketArn": {
    "Fn::GetAtt": ["MyBucket", "Arn"]
  },
  "BucketUrl": {
    "Fn::Sub": "https://${MyBucket}.s3.amazonaws.com"
  }
}
```

**cdk2pulumi Translation (Pulumi)**:
```typescript
const bucketArn = myBucket.arn;
const bucketUrl = pulumi.interpolate`https://${myBucket.bucket}.s3.amazonaws.com`;
```

**shared-iir-poc IR (Expression Model)**:
```typescript
{
  kind: 'Reference',
  reference: {
    targetResourceId: 'MyBucket',
    attributePath: ['Arn'],
    expectedType: 'string'
  }
}
```

**shared-iir-poc → Terraform**:
```hcl
bucket_arn = aws_s3_bucket.my_bucket.arn
bucket_url = "https://${aws_s3_bucket.my_bucket.bucket}.s3.amazonaws.com"
```

**Observation**: Both projects maintain referential integrity; cdk2pulumi uses Pulumi's Output<T> system, shared-iir-poc uses explicit Expression AST

---

## Semantic Capability Example

### Storage with Versioning and Encryption

**CDK L2 Construct** (implicit capabilities):
```typescript
const bucket = new s3.Bucket(this, 'MyBucket', {
  versioned: true,
  encryption: s3.BucketEncryption.S3_MANAGED,
});
```

**cdk2pulumi Flow**:
```
CDK Bucket → CloudFormation Template (versioning + encryption expanded)
          ↓
{
  "Type": "AWS::S3::Bucket",
  "Properties": {
    "VersioningConfiguration": { "Status": "Enabled" },
    "BucketEncryption": {
      "ServerSideEncryptionConfiguration": [...]
    }
  }
}
          ↓
cdk2pulumi → Pulumi (runtime)
          ↓
new aws.s3.Bucket("MyBucket", {
  versioning: { enabled: true },
  serverSideEncryptionConfiguration: { ... }
})
```

**shared-iir-poc Flow** (see `src/lowering/phases/storage.ts:31-126`):
```
Semantic Model:
{
  resourceType: { provider: 'generic', service: 'storage', resource: 'bucket' },
  capabilities: [
    { id: 'storage.versioning', required: true },
    { id: 'storage.encryption', required: true }
  ]
}
          ↓
Lowering Phase (AWS):
- Expand 'storage.versioning' → VersioningConfiguration
- Expand 'storage.encryption' → BucketEncryption
- Map 'generic.storage.bucket' → 'aws.s3.bucket'
          ↓
CloudFormation Serializer:
{
  "Type": "AWS::S3::Bucket",
  "Properties": {
    "VersioningConfiguration": { "Status": "Enabled" },
    "BucketEncryption": { ... }
  }
}
```

**Key Difference**: 
- **cdk2pulumi**: Receives already-expanded CloudFormation; semantic capabilities lost
- **shared-iir-poc**: Operates on semantic capabilities before expansion; can optimize/validate at semantic level

---

## Use Case Comparison

### When to Use cdk2pulumi

✅ **Ideal for**:
- Organizations adopting Pulumi but have existing CDK codebases
- Teams wanting Pulumi's state management and policy-as-code features
- Projects needing Pulumi's secret management and stack references
- Gradual migration from CloudFormation to Pulumi-managed infrastructure
- Using Pulumi's testing framework and IDE integrations

❌ **Not ideal for**:
- Generating static CloudFormation templates (no Pulumi runtime needed)
- Multi-backend synthesis without runtime overhead
- Compile-time validation and optimization
- Projects requiring backend-native state management

### When to Use shared-iir-poc

✅ **Ideal for**:
- Multi-cloud applications needing cloud-neutral semantic models
- Organizations wanting flexibility to switch deployment backends
- Compile-time validation and semantic analysis
- Generating deployment artifacts without runtime dependencies
- Reusable lowering phases (optimization, validation, diagnostics)
- Teams needing backend-native tooling (CloudFormation Console, Terraform Cloud, etc.)

❌ **Not ideal for**:
- Projects deeply invested in Pulumi ecosystem
- Applications requiring runtime state manipulation
- Dynamic infrastructure based on runtime conditions

---

## Compiler Architecture Influences

### cdk2pulumi (Interpreter Pattern)

Inspired by runtime interpreters:
- **Template interpreter**: Reads CloudFormation, executes as Pulumi
- **Just-in-time translation**: Happens during deployment
- **Runtime context**: Access to Pulumi engine, state, outputs

Similar to:
- Python interpreter (reads bytecode, executes)
- JavaScript engines (parse + execute)

### shared-iir-poc (Compiler Pipeline)

Inspired by multi-stage compilers (see README.md line 378-383):
- **Frontend**: Parse constructs → Shared IIR
- **Middle-end**: Lowering phases (optimization, validation)
- **Backend**: Code generation (serializers)
- **Compile-time**: All transformations before deployment

Similar to:
- **LLVM**: Source → IR → Optimization passes → Target code
- **Roslyn**: C# → Syntax tree → Semantic model → IL
- **Rust**: HIR → MIR → LLVM IR → Machine code

---

## Convergence Potential

### Shared Expression Model

Both projects could adopt a common expression AST:

```typescript
// Shared library: @shared-iir/expressions
export interface Expression { ... }
export interface IExpressionVisitor { ... }

// cdk2pulumi visitor
class PulumiExpressionCodegen implements IExpressionVisitor {
  visitReference(expr): string {
    return `${expr.targetResourceId}.${expr.attributePath.join('.')}`;
  }
}

// shared-iir-poc already has visitors for CFN/TF/ARM
```

### Semantic Metadata in CloudAssembly

Enhanced CloudAssembly format:

```json
{
  "version": "1.0.0",
  "artifacts": {
    "MyStack": {
      "type": "aws:cloudformation:stack",
      "properties": {
        "templateFile": "MyStack.template.json",
        "semanticModel": "MyStack.shared-iir.json"  // ← New field
      },
      "metadata": {
        "capabilities": ["storage.versioning", "storage.encryption"],
        "loweringDiagnostics": [...]
      }
    }
  }
}
```

Benefits for cdk2pulumi:
- Access to pre-lowering semantic model
- Better understanding of infrastructure intent
- Improved translation accuracy

---

## Complementary Strengths

### cdk2pulumi Strengths

- **Mature runtime**: Leverages Pulumi's battle-tested engine
- **State management**: Unified state model across providers
- **Policy as code**: Pulumi Crossguard integration
- **Secret management**: Native secret encryption and rotation
- **Existing ecosystem**: Pulumi Cloud, CI/CD integrations
- **Real-time translation**: No need to regenerate artifacts

### shared-iir-poc Strengths

- **Semantic-first**: Operates on infrastructure intent before provider mapping
- **Multi-backend native**: Generate CloudFormation, Terraform, ARM from same model
- **Compile-time validation**: Catch errors before deployment
- **No runtime dependencies**: Pure artifact generation
- **Reusable phases**: Optimization and validation logic shared across backends
- **Backend-native tooling**: Use CloudFormation Console, Terraform Cloud, Azure Portal

Together, they represent complementary approaches to multi-backend infrastructure synthesis:
- **cdk2pulumi**: Runtime flexibility with Pulumi's power
- **shared-iir-poc**: Compile-time transformation with backend portability

---

## References

- cdk2pulumi repository: https://github.com/pulumi/pulumi-tool-cdk2pulumi/
- Pulumi documentation: https://www.pulumi.com/docs/
- AWS CDK CloudAssembly specification: https://github.com/aws/aws-cdk/
- Shared IIR RFCs:
  - [RFC-006: Backend-Neutral Synthesis Architecture](https://github.com/cdktn-io/terraform-provider-cfncompat/pull/8)
  - [RFC-06: Shared Infrastructure Intermediate Representation](https://github.com/open-constructs/cdktn-planning/pull/2)
  - [RFC-07: Azure Integration](https://github.com/open-constructs/cdktn-planning/pull/2)

---

## Conclusion

cdk2pulumi and shared-iir-poc demonstrate two viable approaches to multi-backend infrastructure synthesis:

**cdk2pulumi**: Runtime interpretation through Pulumi's engine
- CloudFormation templates executed as Pulumi programs
- Unified state management
- Access to Pulumi ecosystem features

**shared-iir-poc**: Compile-time transformation through lowering pipeline
- Semantic IR lowered through optimization phases
- Multiple backend artifacts from single source
- Backend-native tooling and state management

Both projects:
- Enable construct reuse across deployment backends
- Preserve semantic relationships (dependencies, references, conditions)
- Map high-level infrastructure intents to provider-specific implementations
- Draw inspiration from compiler architecture (IR, visitors, transformation passes)

The key difference is **when** translation occurs (runtime vs. compile-time) and **what** manages state (Pulumi vs. backend-native).

A future integration combining both approaches could provide:
- Semantic-aware Pulumi generation (shared-iir-poc → Pulumi serializer)
- Pulumi-to-IIR reverse translation (Pulumi → shared-iir-poc → other backends)
- Enhanced CloudAssembly with semantic metadata
- Shared expression and capability libraries

This would create a comprehensive infrastructure translation ecosystem spanning compile-time and runtime approaches.
