# Integration Strategy for Shared IIR

This document outlines a phased, **non-breaking** integration strategy for gradually introducing Shared IIR concepts into:
- [cdk-terrain](https://github.com/open-constructs/cdk-terrain/) - CDKTN-based Terraform constructs
- [terraform-cdk-constructs](https://github.com/Azure/terraform-cdk-constructs/) - Azure CDKTN constructs  
- [aws-cdk](https://github.com/aws/aws-cdk/) - AWS Cloud Development Kit

## Goal

**Simplify multi-backend synthesis from AWS CDK** by introducing an intermediate representation that:
- Enables AWS CDK constructs to synthesize to both CloudFormation AND Terraform
- Leverages AWS Cloud Control API for Terraform provider generation
- Avoids reinventing the wheel across repositories (TerraConstructs/base, cdktn-provider-features-demo, etc.)
- Provides semantic analysis and validation for CDKTN constructs (Terraform only)
- Improves synthesis quality through reusable lowering phases

**Key Distinction**:
- **AWS CDK**: Multi-backend synthesis (CloudFormation OR Terraform from same L2 constructs)
- **CDKTN**: Semantic analysis only (Terraform synthesis unchanged)
- **Not a goal**: Create a new cloud-agnostic language (that's Wing's approach)

## Guiding Principles

1. **Zero breaking changes** - All modifications are additive and opt-in
2. **Backward compatibility** - Existing user code continues to work unchanged
3. **Gradual adoption** - Users can incrementally adopt Shared IIR features
4. **Feature flags** - New behavior gated behind explicit opt-in mechanisms
5. **Interoperability** - Shared IIR and traditional synthesis coexist
6. **Minimal API surface** - Hide complexity behind familiar abstractions

---

## Phase 1: Foundation (Experimental Packages)

### Goal
Establish Shared IIR infrastructure without modifying existing CDK/CDKTN internals.

### Strategy: Side-by-Side Experimental Packages

Create companion packages that extend existing constructs:

```
@shared-iir/core              # Core IR types and interfaces
@shared-iir/aws-cdk           # AWS CDK integration
@cdktn/shared-iir             # CDKTN integration (used by cdk-terrain and Azure)
```

Note: CDKTN packages use the `@cdktn` namespace. The `@cdktn/shared-iir` package provides integration for both AWS (cdk-terrain) and Azure (terraform-cdk-constructs) CDKTN-based projects.

### Implementation

#### 1.1 Core Package (`@shared-iir/core`)

Publish the IR model as a standalone package:

```typescript
// Exported from current src/iir/shared/
export { 
  IirResource, 
  ResourceType, 
  Expression, 
  SharedIirManifest,
  SemanticCapability 
} from '@shared-iir/core';
```

**Integration Point**: None - standalone package
**Breaking Changes**: None
**User Impact**: Zero (opt-in only)

#### 1.2 AWS CDK Integration (`@shared-iir/aws-cdk`)

Add opt-in aspect for IR extraction:

```typescript
import { Aspects, IAspect, IConstruct } from 'aws-cdk-lib';
import { SharedIirAspect } from '@shared-iir/aws-cdk';

class MyStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    // Existing CDK code - UNCHANGED
    const bucket = new s3.Bucket(this, 'MyBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });
    
    // OPT-IN: Enable Shared IIR extraction
    Aspects.of(this).add(new SharedIirAspect());
  }
}
```

**How it works**:
- `SharedIirAspect` visits construct tree during synthesis
- Extracts semantic information from L2 constructs
- Generates Shared IIR manifest alongside CloudFormation template
- Original CloudFormation synthesis is **UNCHANGED**

**CloudAssembly Output**:
```
cdk.out/
  MyStack.template.json           # ← Original CloudFormation (unchanged)
  MyStack.shared-iir.json         # ← New: Shared IIR manifest
  manifest.json                   # ← Enhanced with IIR artifact metadata
```

**Breaking Changes**: None
**User Impact**: Opt-in via `Aspects.of(this).add()`

#### 1.3 CDKTN Integration (`@cdktn/shared-iir`)

For cdk-terrain and terraform-cdk-constructs:

```typescript
import { TerraformStack } from 'cdktn';
import { SharedIirSynthesizer } from '@cdktn/shared-iir';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    // Existing CDKTN code - UNCHANGED
    new S3Bucket(this, 'MyBucket', {
      versioning: { enabled: true },
    });
    
    // OPT-IN: Enable Shared IIR extraction
    this.node.addMetadata('shared-iir:enabled', true);
  }
}

// In app.ts
const app = new App();
const stack = new MyStack(app, 'my-stack');

// OPT-IN: Register IIR synthesizer alongside default
app.synth({
  postSynth: [new SharedIirSynthesizer()],  // ← Additive hook
});
```

**How it works**:
- Hooks into CDKTN's post-synthesis lifecycle
- Walks CDKTN construct tree and generates Shared IIR
- Original Terraform JSON synthesis is **UNCHANGED**
- Works with both AWS (cdk-terrain) and Azure (terraform-cdk-constructs) constructs

**Output**:
```
cdktn.out/
  stacks/my-stack/
    cdk.tf.json                   # ← Original Terraform JSON (unchanged)
    cdk.shared-iir.json           # ← New: Shared IIR manifest
```

**Breaking Changes**: None
**User Impact**: Opt-in via metadata + post-synthesis hook

---

## Phase 2: Enhanced Cloud Assembly (Opt-In Extension)

### Goal
Standardize Shared IIR artifacts in CloudAssembly without breaking existing tools.

### Strategy: Extend CloudAssembly Specification

Add optional `shared-iir` artifact type to CloudAssembly manifest:

```json
{
  "version": "cloud-assembly-schema/36.0",
  "artifacts": {
    "MyStack": {
      "type": "aws:cloudformation:stack",
      "properties": {
        "templateFile": "MyStack.template.json"
      }
    },
    "MyStack.SharedIir": {
      "type": "shared-iir:semantic-model",
      "properties": {
        "manifestFile": "MyStack.shared-iir.json",
        "sourceArtifact": "MyStack"
      },
      "metadata": {
        "shared-iir:version": "1.0.0",
        "shared-iir:capabilities": ["storage.versioning", "storage.encryption"]
      }
    }
  }
}
```

### Implementation

#### 2.1 AWS CDK Cloud Assembly Schema Extension

Contribute to `@aws-cdk/cloud-assembly-schema`:

```typescript
// Addition to cloud-assembly-schema (backward compatible)
export interface ArtifactManifest {
  type: ArtifactType | 'shared-iir:semantic-model';  // ← Union extension
  properties?: {
    // ... existing properties
    manifestFile?: string;      // ← New optional field
    sourceArtifact?: string;    // ← New optional field
  };
}
```

**Breaking Changes**: None (union type extension)
**User Impact**: Existing tools ignore unknown artifact types (by design)

#### 2.2 CDK CLI Enhancement (Optional Feature)

Add optional flag to `cdk synth`:

```bash
# Default behavior - unchanged
cdk synth

# Opt-in to Shared IIR generation
cdk synth --emit-shared-iir

# Or via cdk.json
{
  "app": "node bin/app.js",
  "context": {
    "@shared-iir/enabled": true  // ← Feature flag
  }
}
```

**Implementation**:
- Check for feature flag in synthesis
- If enabled, run `SharedIirAspect` automatically
- Generate additional artifact in CloudAssembly

**Breaking Changes**: None
**User Impact**: Opt-in via flag or context

---

## Phase 3: Multi-Backend Synthesis for AWS CDK (Additive API)

### Goal
Enable AWS CDK constructs to synthesize to both CloudFormation and Terraform, leveraging AWS Cloud Control API.

### Strategy: Parallel Synthesizers with Shared IR Bridge

#### 3.1 AWS CDK Multi-Backend Synthesis

Add optional multi-backend synthesizer using AWS Cloud Control API:

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { MultiBackend } from '@shared-iir/aws-cdk';
import * as s3 from 'aws-cdk-lib/aws-s3';

class MyStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    // Standard AWS CDK L2 constructs - NO CHANGES
    new s3.Bucket(this, 'MyBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });
  }
}

const app = new App();
const stack = new MyStack(app, 'MyStack');

// Default synthesis - UNCHANGED
app.synth(); // ← CloudFormation only

// OPT-IN: Generate Terraform from same AWS CDK constructs
if (process.env.ENABLE_TERRAFORM === 'true') {
  const multiBackend = new MultiBackend(stack);
  multiBackend.synthesize({
    backends: ['cloudformation', 'terraform'],
    outdir: 'cdk.out.multi',
  });
}
```

**Output**:
```
cdk.out/                          # ← Default CloudFormation (unchanged)
  MyStack.template.json

cdk.out.multi/                    # ← Optional: Multi-backend output
  cloudformation/
    MyStack.template.json
  terraform/
    MyStack.tf.json               # ← Generated from AWS CDK L2 constructs
  shared-iir/
    MyStack.shared-iir.json
```

**How it works**:
1. Extract semantic model from AWS CDK L2 constructs
2. Use Shared IIR as intermediate representation
3. CloudFormation serializer: Direct synthesis (existing path)
4. Terraform serializer: Leverage AWS Cloud Control API mappings
5. Reuse logic from TerraConstructs/base and cdktn-provider-features-demo

**Use Cases**:
- Teams preferring Terraform over CloudFormation
- Gradual migration from CloudFormation to Terraform
- Same infrastructure code, different deployment tools
- Avoid maintaining separate AWS CDK and CDKTN codebases

**References**:
- [so0k/cdktn-provider-features-demo](https://github.com/so0k/cdktn-provider-features-demo)
- [TerraConstructs/base](https://github.com/TerraConstructs/base/)

**Breaking Changes**: None
**User Impact**: Completely opt-in

#### 3.2 CDKTN Semantic Analysis (NOT Multi-Backend)

**Important**: CDKTN projects (cdk-terrain, terraform-cdk-constructs) remain **Terraform-only**. Shared IIR provides semantic analysis and tooling improvements, NOT multi-backend generation.

```typescript
import { TerraformStack } from 'cdktn';
import { SemanticAnalyzer } from '@cdktn/shared-iir';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    // Standard CDKTN constructs - NO CHANGES
    new S3Bucket(this, 'MyBucket', {
      versioning: { enabled: true },
    });
  }
}

const app = new App();
const stack = new MyStack(app, 'my-stack');

// OPT-IN: Enable semantic analysis
if (process.env.ENABLE_ANALYSIS === 'true') {
  const analyzer = new SemanticAnalyzer();
  const report = analyzer.analyze(stack, {
    validateTerraformBestPractices: true,
    checkProviderCompatibility: true,
    generateMigrationReport: true, // CDK ↔ CDKTN migration analysis
  });
  
  console.log(report.summary());
}

app.synth(); // ← Default Terraform synthesis (unchanged)
```

**Use Cases**:
- Terraform best practices validation
- Provider compatibility checking (Azure vs AWS provider differences)
- Migration analysis for moving between AWS CDK ↔ CDKTN
- Pre-deployment validation (catch issues before `terraform apply`)
- Semantic metadata extraction for tooling

**Why NO multi-backend for CDKTN?**
- CDKTN already uses Terraform providers directly
- Multi-cloud handled by Terraform provider ecosystem
- No need for CloudFormation/ARM generation from CDKTN constructs

**Breaking Changes**: None
**User Impact**: Opt-in semantic analysis and validation only

---

## Phase 4: Construct-Level Capabilities (Experimental API)

### Goal
Allow constructs to declare semantic capabilities explicitly.

### Strategy: Optional Interface Implementation

#### 4.1 Capability-Aware Constructs (AWS CDK)

Add optional interface for constructs that want to expose capabilities:

```typescript
import { ICapabilityProvider } from '@shared-iir/core';

// Existing constructs - NO CHANGES required
export class Bucket extends Resource implements s3.IBucket {
  // ... existing implementation
}

// NEW: Enhanced constructs can optionally implement ICapabilityProvider
export class EnhancedBucket extends Bucket implements ICapabilityProvider {
  public readonly capabilities = [
    { id: 'storage.versioning', required: this.versioned },
    { id: 'storage.encryption', required: this.encrypted },
    { id: 'storage.lifecycle', required: this.lifecycleRules.length > 0 },
  ];
  
  // All other methods unchanged
}

// User code - works with BOTH
const bucket1 = new Bucket(this, 'Standard');        // ← Works as before
const bucket2 = new EnhancedBucket(this, 'Enhanced'); // ← Opt-in capabilities
```

**Breaking Changes**: None (interface is optional)
**User Impact**: Zero unless explicitly using enhanced constructs

#### 4.2 Capability Declaration (CDKTN)

Similar pattern for CDKTN constructs in cdk-terrain and terraform-cdk-constructs:

```typescript
import { ICapabilityProvider } from '@shared-iir/core';
import { TerraformResource } from 'cdktn';

// Existing CDKTN resources - NO CHANGES
export class S3Bucket extends TerraformResource {
  // ... existing implementation
}

// NEW: Enhanced resource with capabilities (in @cdktn namespace)
export class CapabilityAwareS3Bucket extends S3Bucket implements ICapabilityProvider {
  public readonly capabilities = [
    { id: 'storage.versioning', required: this.versioning?.enabled ?? false },
    { id: 'storage.encryption', required: true },
  ];
}
```

**Package Structure**:
- `@cdktn/aws-s3` - Enhanced cdk-terrain constructs with capabilities
- `@cdktn/azure-storage` - Enhanced Azure constructs with capabilities
- Both use `@shared-iir/core` for capability interfaces

**Breaking Changes**: None
**User Impact**: Opt-in by using enhanced classes from `@cdktn/*` packages

---

## Phase 5: Lowering Pipeline Integration (Advanced Opt-In)

### Goal
Enable users to customize semantic transformations and optimizations.

### Strategy: Plugin Architecture with Sensible Defaults

#### 5.1 Custom Lowering Phases (AWS CDK)

```typescript
import { LoweringPipeline, ILoweringPhase } from '@shared-iir/core';
import { MultiBackend } from '@shared-iir/aws-cdk';

// Custom optimization phase
class MyCustomOptimization implements ILoweringPhase {
  readonly id = 'my-optimization';
  readonly displayName = 'My Custom Optimization';
  
  run(model: SharedIirManifest, context: ILoweringContext): SharedIirManifest {
    // Custom transformation logic
    return model;
  }
}

const app = new App();
const stack = new MyStack(app, 'MyStack');

// OPT-IN: Custom lowering pipeline
if (process.env.CUSTOM_LOWERING === 'true') {
  const pipeline = new LoweringPipeline();
  pipeline.addPhase(new StorageLoweringPhase());      // ← Built-in
  pipeline.addPhase(new MyCustomOptimization());      // ← Custom
  pipeline.addPhase(new ComputeLoweringPhase());      // ← Built-in
  
  const multiBackend = new MultiBackend(stack, { pipeline });
  multiBackend.synthesize({ backends: ['terraform'] });
}

app.synth(); // ← Default synthesis (unchanged)
```

**Breaking Changes**: None
**User Impact**: Advanced opt-in feature

#### 5.2 Lowering Phase Presets

Provide sensible defaults for common scenarios:

```typescript
import { LoweringPresets } from '@shared-iir/core';

// Preset: AWS optimization
const awsOptimized = LoweringPresets.aws({
  optimizeForCost: true,
  enableBestPractices: true,
});

// Preset: Multi-cloud compatible
const multiCloud = LoweringPresets.multiCloud({
  targetPlatforms: ['aws', 'azure'],
  avoidProviderSpecificFeatures: true,
});

const multiBackend = new MultiBackend(stack, { 
  pipeline: awsOptimized  // ← Use preset
});
```

**Breaking Changes**: None
**User Impact**: Opt-in with sensible defaults

---

## Phase 6: Framework Integration (Upstream Contributions)

### Goal
Integrate Shared IIR as an official (but optional) feature of AWS CDK and CDKTN.

### Strategy: Feature-Flagged Core Integration

#### 6.1 AWS CDK Core Integration

Contribute to `aws-cdk-lib`:

```typescript
// In aws-cdk-lib/core/lib/app.ts
export interface AppProps {
  // ... existing properties
  
  /**
   * Enable Shared Infrastructure Intermediate Representation.
   * @experimental
   * @default false
   */
  readonly enableSharedIir?: boolean;
  
  /**
   * Additional synthesis backends.
   * @experimental
   * @default []
   */
  readonly additionalBackends?: string[];
}

export class App extends Construct {
  constructor(props: AppProps = {}) {
    super(undefined, '');
    
    // Existing initialization - unchanged
    
    // New: Optional Shared IIR
    if (props.enableSharedIir) {
      Aspects.of(this).add(new SharedIirAspect());
    }
  }
}
```

**Breaking Changes**: None (all new properties optional with defaults)
**User Impact**: Opt-in via `App` constructor

#### 6.2 CDKTN Core Integration

Contribute to `cdktn`:

```typescript
// In cdktn/lib/app.ts
export interface AppConfig {
  // ... existing config
  
  /**
   * Enable Shared Infrastructure IR for semantic analysis and validation.
   * Does NOT change Terraform output - only adds semantic metadata.
   * @experimental
   * @default false
   */
  readonly enableSharedIir?: boolean;
  
  /**
   * Semantic analysis options.
   * @experimental
   */
  readonly semanticAnalysis?: {
    validateCapabilities?: boolean;
    checkCrossCloudCompatibility?: boolean;
    generateMigrationReport?: boolean;
  };
}

export class App extends Construct {
  constructor(config: AppConfig = {}) {
    super(undefined, 'root');
    
    // Existing initialization - unchanged
    
    // New: Optional Shared IIR for semantic analysis
    if (config.enableSharedIir) {
      this.node.addMetadata('shared-iir:enabled', true);
      if (config.semanticAnalysis) {
        this.node.addMetadata('shared-iir:analysis', config.semanticAnalysis);
      }
    }
  }
}
```

**Breaking Changes**: None
**User Impact**: Opt-in semantic analysis only (Terraform synthesis unchanged)

---

## Migration Path for Existing Projects

### For AWS CDK Users

```typescript
// Step 0: Existing code (no changes)
const app = new App();
const stack = new MyStack(app, 'MyStack');
app.synth();  // ← CloudFormation only

// Step 1: Add Shared IIR extraction (additive)
import { SharedIirAspect } from '@shared-iir/aws-cdk';
Aspects.of(stack).add(new SharedIirAspect());
app.synth();  // ← CloudFormation + Shared IIR manifest

// Step 2: Enable Terraform generation from AWS CDK (when ready)
import { MultiBackend } from '@shared-iir/aws-cdk';
const multiBackend = new MultiBackend(stack);
multiBackend.synthesize({ backends: ['cloudformation', 'terraform'] });
// ← Same AWS CDK constructs → CloudFormation OR Terraform

// Step 3: Customize lowering for Terraform (advanced)
const pipeline = new LoweringPipeline();
pipeline.addPhase(new AwsCloudControlPhase()); // AWS Cloud Control API
pipeline.addPhase(new TerraformOptimizationPhase());
multiBackend.synthesize({ backends: ['terraform'], pipeline });
```

### For CDKTN Users (cdk-terrain & terraform-cdk-constructs)

```typescript
// Step 0: Existing code (no changes)
const app = new App();
const stack = new TerraformStack(app, 'my-stack');
app.synth();  // ← Terraform only

// Step 1: Enable Shared IIR extraction for semantic analysis
import { SharedIirSynthesizer } from '@cdktn/shared-iir';
app.synth({ postSynth: [new SharedIirSynthesizer()] });
// ← Terraform (unchanged) + Shared IIR manifest (for analysis)

// Step 2: Enable semantic analysis
import { SemanticAnalyzer } from '@cdktn/shared-iir';
const analyzer = new SemanticAnalyzer();
const report = analyzer.analyze(stack, {
  validateTerraformBestPractices: true,
  checkProviderCompatibility: true,
  generateMigrationReport: true,
});

// Step 3: Use capability-aware constructs (when available)
import { S3Bucket } from '@cdktn/aws-s3';  // ← Enhanced with capabilities
new S3Bucket(stack, 'bucket', { /* same props */ });
```

### For Azure CDKTN Users (terraform-cdk-constructs)

```typescript
// Step 0: Existing code (no changes)
import { StorageAccount } from '@cdktn/azure-storage';
const storage = new StorageAccount(this, 'storage', { /* props */ });
app.synth();  // ← Terraform only

// Step 1: Enable Shared IIR extraction (additive)
import { SharedIirSynthesizer } from '@cdktn/shared-iir';
app.synth({ postSynth: [new SharedIirSynthesizer()] });
// ← Terraform (unchanged) + Shared IIR manifest (for analysis)

// Step 2: Semantic analysis for Azure
import { SemanticAnalyzer } from '@cdktn/shared-iir';
const analyzer = new SemanticAnalyzer();
const report = analyzer.analyze(stack, {
  validateTerraformBestPractices: true,
  checkAzureProviderCompatibility: true,
  platform: 'azure',
});

// Step 3: Use enhanced Azure constructs (when available)
import { StorageAccount } from '@cdktn/azure-storage';  // ← With capabilities
new StorageAccount(stack, 'storage', { /* same props */ });
```

**Note**: Azure CDKTN constructs focus on Terraform synthesis. Shared IIR enables semantic analysis and validation, **NOT** ARM/Bicep generation from Terraform constructs.

---

## Compatibility Matrix

| Phase | AWS CDK Impact | CDKTN Impact | Breaking Changes | Opt-In Method |
|-------|---------------|--------------|------------------|---------------|
| 1: Experimental Packages | None | None | None | Install `@shared-iir/aws-cdk`, `@cdktn/shared-iir` |
| 2: Enhanced CloudAssembly | Additive artifact | Additive artifact | None | Feature flag / CLI flag |
| 3: Multi-Backend / Analysis | Multi-backend (CFN+TF) | Semantic analysis only | None | Explicit API call |
| 4: Capabilities | New interface | New interface | None | Use enhanced classes from `@cdktn/*` |
| 5: Lowering Pipeline | TF generation | Analysis phases | None | Explicit configuration |
| 6: Core Integration | Optional prop | Optional config | None | Constructor prop |

---

## Technical Safeguards

### 1. Feature Flags

Use feature flags for gradual rollout:

```json
{
  "context": {
    "@shared-iir:core/enable": false,
    "@shared-iir:aws-cdk/terraform-backend": false,
    "@cdktn:shared-iir/semantic-analysis": false
  }
}
```

### 2. Version Pinning

Allow users to control adoption pace:

```json
{
  "dependencies": {
    "aws-cdk-lib": "^2.150.0",
    "@shared-iir/aws-cdk": "^0.1.0",  // ← AWS CDK integration
    "cdktn": "^1.0.0",
    "@cdktn/shared-iir": "^0.1.0"     // ← CDKTN integration
  }
}
```

### 3. Backward Compatibility Tests

Add test suites to ensure no regression:

```typescript
// Ensure traditional synthesis still works
test('traditional synthesis unchanged', () => {
  const app = new App();
  const stack = new Stack(app, 'Test');
  new s3.Bucket(stack, 'Bucket');
  
  const assembly = app.synth();
  
  // Should produce standard CloudFormation
  expect(assembly.getStackByName('Test').template).toMatchSnapshot();
  
  // Should NOT produce Shared IIR (unless opted in)
  expect(assembly.artifacts.find(a => a.type === 'shared-iir:semantic-model'))
    .toBeUndefined();
});
```

### 4. Gradual Construct Migration

Provide adapters for seamless transition:

```typescript
// Adapter: Wrap existing construct with capability awareness
import { addCapabilities } from '@shared-iir/core';

const bucket = new s3.Bucket(this, 'Bucket', { versioned: true });

// Opt-in: Add capabilities to existing construct instance
addCapabilities(bucket, [
  { id: 'storage.versioning', required: true },
]);
```

---

## Rollback Strategy

If issues arise, users can roll back at any phase:

### Phase 1-2: Remove Package/Flag
```bash
# AWS CDK
npm uninstall @shared-iir/aws-cdk

# CDKTN
npm uninstall @cdktn/shared-iir

# Or remove feature flag from cdk.json
```

### Phase 3-5: Remove API Calls
```typescript
// Comment out multi-backend synthesis
// const multiBackend = new MultiBackend(stack);
// multiBackend.synthesize({ backends: ['terraform'] });

app.synth();  // ← Back to standard synthesis
```

### Phase 6: Feature Flag Opt-Out
```typescript
const app = new App({
  enableSharedIir: false,  // ← Explicit opt-out
});
```

---

## Success Metrics

Track adoption and validate non-breaking strategy:

1. **Zero regression reports** on existing CDK/CDKTN functionality
2. **Opt-in rate** for Shared IIR features (target: 5% early adopters in Phase 1)
3. **Issue rate** on GitHub (should not increase for non-adopters)
4. **Performance impact** on traditional synthesis (target: <1% overhead even with package installed)
5. **API stability** (no breaking changes to core APIs throughout phases)

---

## Timeline Recommendation

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1 | 3-6 months | Experimental packages published, early adopter feedback |
| Phase 2 | 2-3 months | CloudAssembly extension standardized |
| Phase 3 | 3-6 months | Multi-backend synthesis validated in production |
| Phase 4 | 6-12 months | Capability-aware constructs library established |
| Phase 5 | 6-12 months | Lowering pipeline patterns documented and battle-tested |
| Phase 6 | 12-18 months | Core framework integration with stable API |

**Total timeline**: 2.5-4 years for full integration while maintaining zero breaking changes

---

## Communication Strategy

### For AWS CDK Users

**Messaging**: 
> "Experimental: Generate Terraform from your CDK code. Your existing CloudFormation synthesis is completely unchanged."

**Channels**:
- Blog post: "Exploring Multi-Backend Synthesis with AWS CDK"
- RFC in aws/aws-cdk repository
- `@experimental` tags on all new APIs

### For CDKTN Users (cdk-terrain, terraform-cdk-constructs)

**Messaging**:
> "Experimental: Enable semantic analysis and validation for your CDKTN infrastructure. Your existing Terraform synthesis is completely unchanged. No additional backends generated."

**Key Clarification**:
- ✅ Semantic capabilities and cross-cloud compatibility analysis
- ✅ Validation and migration reports (CDK ↔ CDKTN)
- ❌ NOT for generating CloudFormation/ARM from Terraform constructs
- ❌ Terraform synthesis remains the single output

**Channels**:
- Blog post: "Semantic Infrastructure Analysis with CDKTN"
- RFC in open-constructs/cdk-terrain repository
- Documentation in Azure/terraform-cdk-constructs repository
- `@cdktn` namespace packages

### For All Users

**Key Points**:
1. ✅ **Opt-in only** - No changes unless you explicitly enable
2. ✅ **Backward compatible** - Existing code works unchanged
3. ✅ **Experimental** - Try it, provide feedback, no commitment
4. ✅ **Separate packages** - Install only if interested
5. ✅ **Standard synthesis unchanged** - CloudFormation/Terraform output identical

---

## Open Questions for Community Feedback

1. **Naming convention**: 
   - AWS CDK: `@shared-iir/aws-cdk` or `@aws-cdk/shared-iir`?
   - CDKTN: `@cdktn/shared-iir` (decided - uses CDKTN namespace)
   - Core: `@shared-iir/core` or different namespace?

2. **CloudAssembly artifact type**: Standardize `shared-iir:semantic-model` or use different namespace?

3. **Feature flag naming**: 
   - AWS CDK: `@shared-iir:*` or `@aws-cdk:shared-iir-*`?
   - CDKTN: `@cdktn:shared-iir/*` (consistent with namespace)

4. **Package ownership**: Who maintains `@shared-iir/core` - AWS, CNCF, open-constructs community?

5. **Analysis scope**: Should semantic analysis be opt-in per-stack or global per-app?

6. **Semantic metadata format**: How much detail should be included in shared-iir.json artifacts?

---

## Conclusion

This strategy enables gradual, risk-free adoption of Shared IIR concepts across the CDK ecosystem:

✅ **Zero breaking changes** at every phase  
✅ **Complete opt-in** - users control adoption pace  
✅ **Interoperability** - old and new coexist  
✅ **Rollback safety** - can revert at any time  
✅ **Production-ready path** - from experiment to core feature  

### Different Goals for Different Frameworks

**AWS CDK**:
- **Primary goal**: Multi-backend synthesis (CloudFormation OR Terraform from same L2 constructs)
- **Approach**: Leverage AWS Cloud Control API for Terraform generation
- **Benefit**: Avoid reinventing the wheel (reuse TerraConstructs/base, cdktn-provider-features-demo patterns)
- **Packages**: `@shared-iir/aws-cdk`
- **Output**: CloudFormation (default) OR Terraform (opt-in)

**CDKTN (cdk-terrain & terraform-cdk-constructs)**:
- **Primary goal**: Semantic analysis and validation (Terraform synthesis unchanged)
- **Approach**: Extract semantic metadata for tooling improvements
- **Benefit**: Better validation, migration analysis, best practices checking
- **Packages**: `@cdktn/shared-iir`, `@cdktn/aws-*`, `@cdktn/azure-*`
- **Output**: Terraform only (with optional semantic metadata)

**Common Infrastructure**:
- Shared IIR as semantic representation
- Reusable lowering phases (capability resolution, validation)
- CloudAssembly format extensions
- Expression model and visitor patterns

The phased approach allows:
- Early adopters to experiment safely (Phase 1-3)
- Production users to stay on stable APIs (Phase 0)
- Framework maintainers to validate before core integration (Phase 4-5)
- Eventual standardization when proven (Phase 6)

This balances innovation velocity with ecosystem stability while respecting each framework's architectural goals.
