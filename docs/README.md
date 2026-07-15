# Shared IIR Documentation

This directory contains comprehensive documentation for the Shared Infrastructure Intermediate Representation (Shared IIR) project.

## Overview

Shared IIR is a **semantic-first, backend-neutral** intermediate representation for infrastructure synthesis that enables:

1. **Multi-backend for AWS CDK** - Generate Terraform from AWS CDK L2 constructs (CloudFormation OR Terraform)
2. **AWS Cloud Control leverage** - Reuse patterns from TerraConstructs/base and cdktn-provider-features-demo
3. **CDKTN semantic analysis** - Better tooling for Terraform synthesis validation
4. **Avoid reinventing the wheel** - Shared lowering pipeline across repositories

## Documentation Structure

### Core Concepts

- **[README](../README.md)** - Project overview, architecture, and motivation
- **[CLAUDE.md](../CLAUDE.md)** - Project-specific development guidelines and conventions

### Architecture Analysis

- **[cdk-from-cfn.md](./cdk-from-cfn.md)** - Shared concepts with cdk-from-cfn (CloudFormation → CDK translation)
- **[cdk2pulumi.md](./cdk2pulumi.md)** - Shared concepts with cdk2pulumi (CDK CloudAssembly → Pulumi runtime)

### Integration Strategy

- **[integration-strategy.md](./integration-strategy.md)** - Non-breaking, phased adoption strategy for AWS CDK, CDKTN, and Azure

## Quick Links by Audience

### For AWS CDK Users

**Current State**: AWS CDK synthesizes to CloudFormation only

**Integration** (Non-breaking):
1. Install `@shared-iir/aws-cdk`
2. Add `SharedIirAspect` to extract semantic model
3. Optionally generate Terraform from AWS CDK L2 constructs
4. Leverage AWS Cloud Control API for provider mappings
5. See: [Integration Strategy - AWS CDK](./integration-strategy.md#12-aws-cdk-integration-shared-iraws-cdk)

**Key Benefit**: Same AWS CDK code → CloudFormation OR Terraform (reuse TerraConstructs/base patterns)

### For CDKTN Users (cdk-terrain, terraform-cdk-constructs)

**Current State**: CDKTN synthesizes to Terraform only

**Integration** (Non-breaking):
1. Install `@cdktn/shared-iir`
2. Add `SharedIirSynthesizer` post-synth hook
3. Enable semantic analysis and validation
4. Get Terraform best practices checks and CDK↔CDKTN migration guidance
5. See: [Integration Strategy - CDKTN](./integration-strategy.md#13-cdktn-integration-cdktnshared-iir)

### For Infrastructure Engineers

**Problem**: 
- AWS CDK teams wanting Terraform have to rewrite constructs (no reuse)
- Repositories like TerraConstructs/base and cdktn-provider-features-demo reinvent the wheel
- AWS Cloud Control API mappings duplicated across projects
- CDKTN lacks advanced semantic analysis and validation

**Solution**: Shared IIR enables:
- **AWS CDK**: Generate Terraform from existing L2 constructs (multi-backend synthesis)
- **CDKTN**: Extract semantic metadata for better tooling (analysis only)
- **Both**: Reuse lowering phases and AWS Cloud Control mappings

**See**:
- [Integration Strategy](./integration-strategy.md)
- [Multi-Backend for AWS CDK](./integration-strategy.md#31-aws-cdk-multi-backend-synthesis)
- [so0k/cdktn-provider-features-demo](https://github.com/so0k/cdktn-provider-features-demo)
- [TerraConstructs/base](https://github.com/TerraConstructs/base/)

### For Framework Maintainers

**Integration Path** (Non-breaking, opt-in adoption):
- Phase 1-3: Experimental packages alongside existing frameworks
- Phase 4-5: Optional capability-aware constructs
- Phase 6: Feature-flagged core integration
- Timeline: 2.5-4 years
- See: [Integration Strategy](./integration-strategy.md)

**Focus**: Improve synthesis tooling quality, not replace existing frameworks

### For Researchers & Architects

**Architectural Comparisons**:

| Project | Direction | Approach | Documentation |
|---------|-----------|----------|---------------|
| **cdk-from-cfn** | CloudFormation → CDK | Code generation (one-time) | [cdk-from-cfn.md](./cdk-from-cfn.md) |
| **cdk2pulumi** | CDK → Pulumi | Runtime interpretation | [cdk2pulumi.md](./cdk2pulumi.md) |
| **Shared IIR** | Constructs → Multiple backends | Compile-time transformation | [long-term-vision.md](./long-term-vision.md) |

**Key Insight**: All three projects use intermediate representations to decouple infrastructure semantics from deployment syntax. Shared IIR focuses on **compile-time** multi-backend synthesis with **semantic-first** modeling.

## Architecture Diagrams

### Current State (Separate Ecosystems)

```
AWS CDK Constructs
    ↓
CloudFormation (only)
```

```
CDKTN Constructs (AWS)
    ↓
Terraform/AWS (only)
```

```
CDKTN Constructs (Azure)
    ↓
Terraform/Azure (only)
```

### Integration Approach (Non-Breaking)

```
AWS CDK L2 Constructs
    ↓
CloudFormation (default, unchanged)
    ↓
[Optional: MultiBackend via Shared IIR]
    ↓
Terraform (leveraging AWS Cloud Control API)
```

```
CDKTN Constructs
    ↓
Terraform (default, unchanged)
    ↓
[Optional: SharedIirSynthesizer]
    ↓
Shared IIR → Semantic Analysis, Validation, Migration Tools (NOT multi-backend)
```

**Key Point**: AWS CDK gets multi-backend (CFN+TF), CDKTN gets analysis (TF only)

## Compiler Architecture Inspiration

Shared IIR draws inspiration from modern compilers:

| Compiler Stage | Shared IIR Equivalent | Purpose |
|----------------|----------------------|---------|
| Frontend (Parser) | Construct Tree Walker | Extract infrastructure from CDK/CDKTN constructs |
| IR (LLVM IR, GIMPLE) | Shared IIR | Backend-neutral semantic representation |
| Optimization Passes | Lowering Pipeline Phases | Validate, optimize, expand capabilities |
| Target Lowering | Platform IR (AWS/Azure/GCP) | Provider-specific transformations |
| Code Generator | Serializers | Emit CloudFormation/Terraform/ARM/Pulumi |

**Key References**:
- LLVM: Source → IR → Optimization → Target machine code
- Roslyn: C# → Syntax tree → Semantic model → IL
- Rust: HIR → MIR → LLVM IR → Machine code

## Design Principles

1. **Semantic before syntactic** - Model infrastructure intent, not deployment syntax
2. **Backend neutrality** - Deployment engines are implementation details
3. **Extensibility** - New backends without changing semantic model
4. **Separation of concerns** - Each layer owns a single responsibility
5. **Composition over inheritance** - Platform IR wraps Shared IIR, doesn't replace it

## Key Concepts

### Shared IIR (Semantic Model)

Cloud-neutral infrastructure representation:
- **Resources**: Generic types (storage.bucket, compute.function)
- **Expressions**: References, conditionals, functions (backend-agnostic AST)
- **Capabilities**: Semantic features (versioning, encryption, replication)
- **Dependencies**: Explicit ordering relationships

See: [src/iir/shared/](../src/iir/shared/)

### Platform IR (AWS, Azure, GCP)

Provider-specific but backend-neutral:
- Extends Shared IIR with platform details
- Maps semantic capabilities to provider features
- Example: `storage.bucket` → `aws.s3.bucket` or `azure.storage.account`

See: [src/iir/aws/](../src/iir/aws/), [src/iir/azure/](../src/iir/azure/)

### Lowering Pipeline

Compiler-style transformation phases:
- **Input**: Shared IIR (semantic)
- **Phases**: Capability resolution, optimization, validation
- **Output**: Platform IR (provider-specific)

See: [src/lowering/](../src/lowering/)

### Serializers

Backend-specific code generators:
- Consume Platform IR
- Generate deployment artifacts (JSON, HCL, YAML)
- Examples: CloudFormation, Terraform, ARM, Pulumi

See: [src/serializers/](../src/serializers/)

### Cloud Assembly

Packaging format for synthesis output:
- Mirrors AWS CDK Cloud Assembly structure
- Contains deployment artifacts + metadata
- Backend-neutral artifact types

See: [src/assembly/](../src/assembly/)

## RFCs and Related Work

### RFCs

This repository implements concepts from several RFCs:

1. **RFC-006: Backend-Neutral Synthesis Architecture**
   - Repository: [cdktn-io/terraform-provider-cfncompat](https://github.com/cdktn-io/terraform-provider-cfncompat/pull/8)
   - Focus: AWS CloudFormation compatibility for Terraform

2. **RFC-06: Shared Infrastructure Intermediate Representation**
   - Repository: [open-constructs/cdktn-planning](https://github.com/open-constructs/cdktn-planning/pull/2)
   - Focus: Cross-framework semantic model

3. **RFC-07: Azure Integration**
   - Repository: [open-constructs/cdktn-planning](https://github.com/open-constructs/cdktn-planning/pull/2)
   - Focus: Azure provider support in CDKTN

### Related Projects

- **[cdk-from-cfn](https://github.com/cdklabs/cdk-from-cfn/)** - CloudFormation → CDK code generation
- **[cdk2pulumi](https://github.com/pulumi/pulumi-tool-cdk2pulumi/)** - CDK CloudAssembly → Pulumi runtime
- **[AWS CDK](https://github.com/aws/aws-cdk/)** - AWS Cloud Development Kit
- **[CDKTF](https://github.com/hashicorp/terraform-cdk/)** - Cloud Development Kit for Terraform (archived)
- **[CDKTN](https://github.com/open-constructs/cdk-terrain/)** - CDK Terrain is the successor to CDKTF
- **[terraform-cdk-constructs](https://github.com/Azure/terraform-cdk-constructs/)** - CDKTN-based Azure constructs

## Development Status

This repository is an **architectural proof-of-concept** demonstrating:

✅ Shared IIR semantic model  
✅ Platform IR (AWS, Azure)  
✅ Lowering pipeline with phases  
✅ Multiple serializers (CloudFormation, Terraform, ARM, Mock)  
✅ Cloud Assembly packaging  
✅ Expression model with visitor pattern  
✅ Capability system  

**Not yet implemented**:
- Full L2 construct library
- Production-ready serializers
- Comprehensive validation rules
- Optimization passes
- IDE integrations
- CLI tools

## Contributing

This is currently a **research and planning** repository. Contributions are welcome in the form of:

- RFC feedback and discussions
- Architecture suggestions
- Integration strategy refinement
- Documentation improvements
- Proof-of-concept implementations

## License

See [LICENSE](../LICENSE) for details.

---

## Document Change Log

| Date | Document | Change |
|------|----------|--------|
| 2026-07-14 | All | Initial documentation creation |
| 2026-07-14 | cdk-from-cfn.md | Analysis of architectural similarities |
| 2026-07-14 | cdk2pulumi.md | Comparison with Pulumi runtime approach |
| 2026-07-14 | integration-strategy.md | Non-breaking adoption strategy focused on tooling improvements |

---

**Questions?** Open an issue or discussion in the repository.

**Next Steps**: See [Integration Strategy](./integration-strategy.md) for adoption roadmap focused on improving synthesis tooling quality.
