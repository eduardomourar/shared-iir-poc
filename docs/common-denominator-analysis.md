# Common Denominator Analysis: AWS CDK, cdk-terrain, and cdk8s-core

This document analyzes the common patterns across three construct-based infrastructure frameworks to identify the minimal abstraction needed for Shared IIR.

## Executive Summary

**Question**: Will Shared IIR simplify maintenance or create too much interdependency?

**Finding**: All three frameworks share a **very thin common core** (~5 abstractions). Shared IIR should be equally thin, focusing on the synthesis pipeline, not the construct model.

**Recommendation**: Shared IIR should be a **synthesis-time tool**, not a construct-time abstraction. Keep it similar to how the `constructs` library is - minimal, focused, and non-invasive.

---

## Framework Overview

| Framework | Purpose | Output | Core Library |
|-----------|---------|--------|--------------|
| **aws-cdk** | AWS infrastructure | CloudFormation | `aws-cdk-lib/core` + `constructs` |
| **cdk-terrain** | Multi-cloud infrastructure | Terraform | `cdktn` + `constructs` |
| **cdk8s-core** | Kubernetes manifests | YAML | `cdk8s` + `constructs` |

---

## Core Abstraction Analysis

### 1. Common Denominator: The `constructs` Library

All three frameworks depend on the same base library: [constructs](https://github.com/aws/constructs)

**What `constructs` provides**:
```typescript
// From constructs library (shared by ALL)
export interface IConstruct {
  readonly node: Node;
}

export class Construct implements IConstruct {
  public readonly node: Node;
  
  constructor(scope: Construct, id: string) {
    this.node = new Node(this, scope, id);
  }
}

export class Node {
  // Tree structure
  public readonly scope?: IConstruct;
  public readonly id: string;
  public readonly children: IConstruct[];
  
  // Metadata system
  public addMetadata(type: string, data: any): void;
  public addDependency(...deps: IDependable[]): void;
  public addValidation(validation: IValidation): void;
}
```

**Size**: ~2000 lines of code  
**Scope**: Tree structure + metadata system  
**Complexity**: Minimal - just enough to build a tree  

### 2. Framework-Specific Layers

Each framework adds its own thin layer on top of `constructs`:

#### AWS CDK Core (`aws-cdk-lib/core`)

```typescript
// aws-cdk-lib/core/lib/stack.ts
export class Stack extends Construct {
  public readonly stackName: string;
  public readonly region?: string;
  public readonly account?: string;
  
  // CloudFormation-specific
  public addDependency(target: Stack, reason?: string): void;
  public exportValue(exportedValue: any, options?: ExportValueOptions): void;
  
  // Synthesis hook
  protected synthesize(session: ISynthesisSession): void {
    // Generate CloudFormation template
  }
}

// aws-cdk-lib/core/lib/app.ts
export class App extends Construct {
  public synth(options?: StageSynthesisOptions): CloudAssembly {
    // 1. Prepare (call prepare() on all constructs)
    // 2. Validate (call validate() on all constructs)
    // 3. Synthesize (call synthesize() on all constructs)
    // 4. Package into CloudAssembly
  }
}
```

**Key Abstractions**:
- `Stack` - Unit of deployment (CloudFormation stack)
- `App` - Root of the tree, drives synthesis
- `CloudAssembly` - Packaged output
- `CfnResource` - Low-level CloudFormation resource

**Synthesis Flow**: `App.synth()` → Walk tree → Call `synthesize()` → Generate CFN templates → Package as CloudAssembly

#### cdk-terrain Core (`cdktn`)

```typescript
// cdktn/lib/terraform-stack.ts
export class TerraformStack extends Construct {
  public readonly stackName: string;
  
  // Terraform-specific
  public addProvider(provider: TerraformProvider): void;
  public addOverride(path: string, value: any): void;
  
  // Synthesis
  public toTerraform(): any {
    // Generate Terraform JSON
  }
}

// cdktn/lib/app.ts
export class App extends Construct {
  public synth(): void {
    // 1. Prepare
    // 2. Validate
    // 3. Call toTerraform() on all stacks
    // 4. Write JSON files to outdir
  }
}
```

**Key Abstractions**:
- `TerraformStack` - Unit of deployment (Terraform stack)
- `App` - Root, drives synthesis
- `TerraformResource` - Low-level Terraform resource
- No CloudAssembly concept (direct file output)

**Synthesis Flow**: `App.synth()` → Walk tree → Call `toTerraform()` → Write JSON files

#### cdk8s Core (`cdk8s`)

```typescript
// cdk8s/lib/chart.ts
export class Chart extends Construct {
  public readonly namespace?: string;
  public readonly labels?: { [key: string]: string };
  
  // Kubernetes-specific
  public addDependency(...deps: IConstruct[]): void;
  
  // Synthesis
  public toJson(): any[] {
    // Generate array of Kubernetes manifests
  }
}

// cdk8s/lib/app.ts
export class App extends Construct {
  public synth(): void {
    // 1. Call toJson() on all charts
    // 2. Write YAML files to outdir
  }
}
```

**Key Abstractions**:
- `Chart` - Unit of deployment (Kubernetes namespace/app)
- `App` - Root, drives synthesis
- `ApiObject` - Low-level Kubernetes resource
- No CloudAssembly concept (direct YAML output)

**Synthesis Flow**: `App.synth()` → Walk tree → Call `toJson()` → Write YAML files

---

## Comparative Analysis

### What They Share (Common Denominator)

| Abstraction | AWS CDK | cdk-terrain | cdk8s | Purpose |
|-------------|---------|-------------|-------|---------|
| **Construct tree** | ✅ | ✅ | ✅ | Hierarchical resource organization |
| **App (root)** | ✅ | ✅ | ✅ | Drives synthesis process |
| **Stack/Chart (deployment unit)** | ✅ Stack | ✅ TerraformStack | ✅ Chart | Boundary for deployment |
| **Synthesis lifecycle** | ✅ prepare/validate/synth | ✅ prepare/validate/synth | ✅ validate/synth | Three-phase process |
| **Metadata system** | ✅ (via Node) | ✅ (via Node) | ✅ (via Node) | Annotations, tags, aspects |
| **Dependencies** | ✅ | ✅ | ✅ | Resource ordering |

### What They DON'T Share (Framework-Specific)

| Aspect | AWS CDK | cdk-terrain | cdk8s |
|--------|---------|-------------|-------|
| **Output format** | CloudFormation JSON | Terraform JSON | Kubernetes YAML |
| **Packaging** | CloudAssembly (structured) | Direct file output | Direct file output |
| **Low-level resource** | CfnResource (CFN schema) | TerraformResource (TF schema) | ApiObject (K8s schema) |
| **Backend concept** | CloudFormation-only | Terraform-only | kubectl-only |
| **Cross-references** | Fn::GetAtt, Ref | Terraform references | Kubernetes selectors |
| **Aspects** | Heavy use (tags, IAM) | Minimal | Minimal |

---

## Synthesis Pipeline Comparison

### AWS CDK Synthesis

```typescript
App.synth() {
  // Phase 1: Prepare
  for (const construct of tree) {
    construct.onPrepare();
  }
  
  // Phase 2: Validate
  for (const construct of tree) {
    const errors = construct.onValidate();
    if (errors.length > 0) throw new Error();
  }
  
  // Phase 3: Synthesize
  for (const stack of stacks) {
    const template = {
      AWSTemplateFormatVersion: '2010-09-09',
      Resources: {},
      Outputs: {},
    };
    
    for (const resource of stack.node.findAll()) {
      if (resource instanceof CfnResource) {
        template.Resources[resource.logicalId] = {
          Type: resource.cfnResourceType,
          Properties: resource.cfnProperties,
        };
      }
    }
    
    writeFile(`${stack.stackName}.template.json`, JSON.stringify(template));
  }
  
  // Phase 4: Package
  return new CloudAssembly(outdir, {
    stacks: [...],
    artifacts: [...],
    manifest: {...},
  });
}
```

### cdk-terrain Synthesis

```typescript
App.synth() {
  // Phase 1: Prepare
  for (const construct of tree) {
    construct.onPrepare();
  }
  
  // Phase 2: Validate
  for (const construct of tree) {
    const errors = construct.onValidate();
  }
  
  // Phase 3: Synthesize
  for (const stack of stacks) {
    const config = {
      terraform: { required_version: '>= 1.0' },
      provider: {},
      resource: {},
    };
    
    for (const resource of stack.node.findAll()) {
      if (resource instanceof TerraformResource) {
        const resourceType = resource.terraformResourceType;
        const resourceName = resource.friendlyUniqueId;
        config.resource[resourceType] = config.resource[resourceType] || {};
        config.resource[resourceType][resourceName] = resource.toTerraform();
      }
    }
    
    writeFile(`${stack.stackName}.tf.json`, JSON.stringify(config));
  }
  
  // No packaging phase
}
```

### cdk8s Synthesis

```typescript
App.synth() {
  // Phase 1: Validate
  for (const chart of charts) {
    chart.onValidate();
  }
  
  // Phase 2: Synthesize
  for (const chart of charts) {
    const manifests = [];
    
    for (const apiObject of chart.node.findAll()) {
      if (apiObject instanceof ApiObject) {
        manifests.push({
          apiVersion: apiObject.apiVersion,
          kind: apiObject.kind,
          metadata: apiObject.metadata,
          spec: apiObject.spec,
        });
      }
    }
    
    writeFile(`${chart.name}.yaml`, yaml.dump(manifests));
  }
  
  // No packaging phase
}
```

---

## Pattern: The Common Synthesis Skeleton

All three frameworks follow the same high-level pattern:

```typescript
// UNIVERSAL PATTERN
class App {
  synth() {
    // 1. PREPARE (optional)
    walkTree(construct => construct.onPrepare());
    
    // 2. VALIDATE
    const errors = walkTree(construct => construct.onValidate());
    if (errors.length > 0) throw new Error();
    
    // 3. SYNTHESIZE
    for (const deploymentUnit of deploymentUnits) {
      const output = {}; // Format varies: CFN JSON, TF JSON, K8s YAML
      
      for (const resource of deploymentUnit.resources) {
        output[resource.id] = resource.toBackendFormat();
      }
      
      writeFile(output);
    }
    
    // 4. PACKAGE (optional)
    return packageOutput(); // Only AWS CDK does this
  }
}
```

**Common Phases**: Prepare → Validate → Synthesize → (Package)

**Variation Point**: Step 3 (toBackendFormat) - this is where backends differ

---

## Where Shared IIR Fits

### Option 1: Heavy Abstraction (❌ TOO MUCH)

Replace the construct model entirely:

```typescript
// BAD: Trying to unify construct APIs
class UniversalStack extends Construct {
  synthesize(): SemanticModel {
    // Returns backend-agnostic model
  }
}

class UniversalResource extends Construct {
  toSemanticModel(): IirResource {
    // All resources must implement this
  }
}

// PROBLEM: Forces all frameworks to change their core abstractions
// PROBLEM: Creates tight coupling
// PROBLEM: Breaks existing ecosystems
```

**Why this is bad**: Too invasive, creates dependency hell, breaks compatibility.

### Option 2: Thin Synthesis Hook (✅ CORRECT)

Insert Shared IIR as an optional synthesis-time hook:

```typescript
// GOOD: Opt-in synthesis hook
class App {
  synth(options?: { iir?: SharedIirOptions }) {
    // Standard synthesis (unchanged)
    const assembly = this.standardSynth();
    
    // Optional: Extract IIR
    if (options?.iir) {
      const iir = extractSharedIir(this);
      assembly.addArtifact('shared-iir', iir);
    }
    
    return assembly;
  }
}

// Extraction happens at synthesis time, not construct time
function extractSharedIir(app: App): SharedIirManifest {
  const resources: IirResource[] = [];
  
  for (const construct of app.node.findAll()) {
    if (construct instanceof CfnResource) {
      resources.push(extractFromCfn(construct));
    } else if (construct instanceof TerraformResource) {
      resources.push(extractFromTerraform(construct));
    } else if (construct instanceof ApiObject) {
      resources.push(extractFromK8s(construct));
    }
  }
  
  return { resources, outputs: [] };
}
```

**Why this is good**:
- ✅ No changes to construct APIs
- ✅ No new base classes
- ✅ Works with existing frameworks
- ✅ Opt-in, not required
- ✅ Synthesis-time extraction, not construct-time modeling

---

## Minimal Common Abstraction

Based on the analysis, the **minimal common denominator** is:

### 1. Tree Structure (already solved by `constructs`)

```typescript
// From constructs library (ALREADY EXISTS)
interface IConstruct {
  readonly node: Node;
}
```

**Status**: ✅ Solved, no Shared IIR needed

### 2. Synthesis Lifecycle (already solved by frameworks)

```typescript
// From constructs library (ALREADY EXISTS)
interface IConstruct {
  onPrepare?(): void;
  onValidate?(): string[];
  onSynthesize?(session: ISynthesisSession): void;
}
```

**Status**: ✅ Solved, no Shared IIR needed

### 3. Resource Representation (varies by backend - THIS IS WHERE IIR HELPS)

```typescript
// Different in each framework:
CfnResource.toCloudFormation() → CloudFormation JSON
TerraformResource.toTerraform() → Terraform JSON
ApiObject.toJson() → Kubernetes JSON

// Shared IIR provides common representation:
extractSharedIir(construct) → SharedIirManifest
```

**Status**: ⚠️ This is where Shared IIR adds value

---

## Shared IIR Value Proposition

### What Shared IIR Should Be

A **synthesis-time extraction tool**, similar to how `constructs` is a **tree-building tool**.

```
┌─────────────────────────────────────────────────────────┐
│ constructs library (tree structure)                     │
│ - Minimal: ~2000 lines                                  │
│ - Focused: Tree + metadata only                         │
│ - Non-invasive: No framework-specific logic             │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │
                    Used by all
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
    │ AWS CDK  │  │cdk-terrain│  │  cdk8s    │
    │   Core   │  │   Core    │  │   Core    │
    └────┬─────┘  └─────┬─────┘  └─────┬─────┘
         │               │               │
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Shared IIR (synthesis extraction)                       │
│ - Minimal: Extraction logic only                        │
│ - Focused: Semantic model extraction                    │
│ - Non-invasive: Synthesis-time hook                     │
└─────────────────────────────────────────────────────────┘
```

### What Shared IIR Should NOT Be

❌ A new construct base class  
❌ A replacement for framework cores  
❌ A unified API across frameworks  
❌ A runtime dependency for constructs  
❌ A framework users must learn  

### What Shared IIR SHOULD Be

✅ An extraction library for synthesis-time  
✅ A common IR format for tooling  
✅ An optional hook, not a requirement  
✅ A way to avoid duplicating AWS Cloud Control mappings  
✅ A bridge for migration tools (CDK ↔ CDKTN)  

---

## Implementation Recommendation

### Thin Abstraction Model

```typescript
// @shared-iir/core (the "constructs" equivalent for synthesis)

export interface IirExtractor {
  // Extract semantic model from any construct tree
  extract(app: IConstruct): SharedIirManifest;
}

export class AwsCdkExtractor implements IirExtractor {
  extract(app: IConstruct): SharedIirManifest {
    // Walk tree, find CfnResources, extract to IIR
  }
}

export class CdkTerrainExtractor implements IirExtractor {
  extract(app: IConstruct): SharedIirManifest {
    // Walk tree, find TerraformResources, extract to IIR
  }
}

export class Cdk8sExtractor implements IirExtractor {
  extract(app: IConstruct): SharedIirManifest {
    // Walk tree, find ApiObjects, extract to IIR
  }
}
```

**Size target**: ~5000 lines (similar to `constructs` library)  
**Scope**: Extraction logic + IR model  
**Integration**: Synthesis-time hook, not construct-time dependency  

### Integration Pattern

```typescript
// AWS CDK usage (opt-in)
import { App, Stack } from 'aws-cdk-lib';
import { AwsCdkExtractor } from '@shared-iir/aws-cdk';

const app = new App();
const stack = new MyStack(app, 'Stack');

// Standard synthesis (unchanged)
const assembly = app.synth();

// Optional: Extract IIR for tooling
const extractor = new AwsCdkExtractor();
const iir = extractor.extract(app);
console.log(iir); // Use for analysis, validation, etc.
```

**Key Point**: Shared IIR is a **synthesis-time tool**, not a **construct-time framework**.

---

## Complexity Analysis

### Without Shared IIR

```
Repositories maintaining AWS Cloud Control mappings:
1. TerraConstructs/base
2. cdktn-provider-features-demo
3. aws-cdk (implicit in L2 constructs)

Total duplication: 3x
Maintenance cost: High (each updates independently)
```

### With Shared IIR

```
Repositories using Shared IIR:
1. @shared-iir/core (central mappings)
2. @shared-iir/aws-cdk (AWS CDK extractor)
3. @shared-iir/cdktn (CDKTN extractor)

Total duplication: 0x (reuse from @shared-iir/core)
Maintenance cost: Low (update once, benefits all)
```

### Interdependency Risk

**Question**: Does Shared IIR create too much interdependency?

**Answer**: No, IF it follows the `constructs` library model:

| Aspect | constructs Library | Shared IIR (proposed) |
|--------|-------------------|----------------------|
| **When used** | Construct definition time | Synthesis time |
| **Scope** | Tree structure | Semantic extraction |
| **Size** | ~2000 lines | ~5000 lines (target) |
| **Breaking changes** | Rare (stable API) | Rare (synthesis-time only) |
| **Framework coupling** | Loose (just tree interface) | Loose (just extraction interface) |
| **User visibility** | Hidden (via framework) | Hidden (opt-in tooling) |

**Risk Level**: ⬇️ Low, similar to `constructs` library

---

## Comparison with `constructs` Library Model

### How `constructs` Succeeded

The `constructs` library is the gold standard for thin abstraction:

**What it does**:
- Provides tree structure (`Construct`, `Node`)
- Metadata system (`node.addMetadata`)
- Dependency tracking (`node.addDependency`)

**What it does NOT do**:
- ❌ Define resource types
- ❌ Implement synthesis logic
- ❌ Dictate output format
- ❌ Provide framework-specific APIs

**Result**: Used by AWS CDK, CDKTN, cdk8s, cdk8s-plus, Projen, and more. Zero coupling issues.

### How Shared IIR Should Follow This Model

**What Shared IIR should do**:
- Provide semantic extraction (`IirExtractor`)
- Define IR format (`SharedIirManifest`)
- Offer reusable lowering phases (capability resolution)

**What Shared IIR should NOT do**:
- ❌ Replace construct base classes
- ❌ Require framework changes
- ❌ Dictate synthesis flow
- ❌ Force adoption

**Goal**: Be the `constructs` library for synthesis - minimal, focused, optional.

---

## Decision Matrix

### Should Shared IIR be a thin abstraction?

| Factor | Thin Abstraction | Heavy Framework | Winner |
|--------|-----------------|-----------------|--------|
| **Adoption barrier** | Low (opt-in) | High (rewrite needed) | ✅ Thin |
| **Maintenance burden** | Low (small surface) | High (large surface) | ✅ Thin |
| **Breaking change risk** | Low (synthesis-time) | High (construct-time) | ✅ Thin |
| **Framework coupling** | Loose | Tight | ✅ Thin |
| **Reusability** | High (works with all) | Low (framework-specific) | ✅ Thin |
| **Innovation speed** | Fast (independent) | Slow (coordinated) | ✅ Thin |

**Recommendation**: ✅ **Thin abstraction** (similar to `constructs` library model)

---

## Common Denominator Summary

### What ALL frameworks share (leverage this)

1. **Tree structure** (via `constructs` library) - ✅ Already solved
2. **Synthesis lifecycle** (prepare/validate/synth) - ✅ Already solved
3. **Metadata system** (`node.addMetadata`) - ✅ Already solved
4. **Resource concept** (something to deploy) - ⚠️ Format varies (IIR helps here)

### What Shared IIR adds (new capabilities)

1. **Semantic extraction** - Convert framework-specific resources → common IR
2. **AWS Cloud Control mappings** - Reuse across AWS CDK and CDKTN
3. **Lowering phases** - Reusable transformations (capability resolution, validation)
4. **Tooling foundation** - Analysis, migration, cost estimation

### What Shared IIR should NOT add (avoid complexity)

1. ❌ New construct base classes
2. ❌ Framework-specific synthesis logic
3. ❌ Runtime dependencies for constructs
4. ❌ Mandatory adoption paths

---

## Final Recommendation

### Shared IIR Should Be

**A synthesis-time extraction library, not a construct-time framework.**

**Size**: ~5000 lines (small, like `constructs`)  
**Scope**: Extraction + IR model + lowering phases  
**Integration**: Optional synthesis hook  
**Model**: Follow `constructs` library pattern  

### Package Structure

```
@shared-iir/core                   # ~2000 lines: IR model, base extractors
@shared-iir/aws-cdk               # ~1000 lines: AWS CDK extractor
@shared-iir/cdktn                 # ~1000 lines: CDKTN extractor
@shared-iir/cdk8s                 # ~1000 lines: cdk8s extractor (optional)
@shared-iir/lowering              # ~2000 lines: Reusable phases
```

**Total**: ~7000 lines (manageable, maintainable)

### Integration Pattern

```typescript
// Existing code (unchanged)
const app = new App();
const stack = new MyStack(app, 'Stack');
app.synth(); // ← Works exactly as before

// New capability (opt-in)
import { AwsCdkExtractor } from '@shared-iir/aws-cdk';
const iir = new AwsCdkExtractor().extract(app);
// Use IIR for: analysis, Terraform generation, migration, etc.
```

---

## Conclusion

**Will Shared IIR simplify or complicate?**

✅ **SIMPLIFY** - IF it follows the `constructs` library model:
- Thin abstraction (synthesis-time only)
- Loose coupling (extraction interface only)
- Optional adoption (opt-in tooling)
- Focused scope (semantic extraction + IR)

❌ **COMPLICATE** - IF it tries to be a framework:
- Heavy abstraction (new construct base classes)
- Tight coupling (mandatory dependency)
- Forced adoption (breaking changes)
- Broad scope (synthesis + deployment)

**The key insight from comparing AWS CDK, cdk-terrain, and cdk8s**:

They all work because they're **thin layers** on top of `constructs`. Shared IIR should be a **thin layer** on top of synthesis, following the same pattern.

**Common denominator**: Tree structure (solved by `constructs`) + Synthesis flow (solved by frameworks) + **Semantic extraction (Shared IIR's job)**

**Keep it thin. Keep it focused. Keep it optional.**
