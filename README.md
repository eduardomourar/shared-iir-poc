# Shared Infrastructure Intermediate Representation (Shared IIR)

> A proof-of-concept for backend-neutral infrastructure synthesis.

## Overview

This repository demonstrates a compiler-inspired synthesis architecture that decouples infrastructure modeling from deployment backends.

```
Construct Tree → Shared IIR → Lowering Pipeline → Cloud Assembly → Serializer → Backend
```

**Key idea**: A single construct tree can synthesize to multiple deployment engines (CloudFormation, Terraform, ARM) through an intermediate representation.

## Architecture

```
┌─────────────────┐
│  AWS CDK L2/L3  │
└────────┬────────┘
         │ extract
         ▼
┌─────────────────┐
│   Shared IIR    │  Backend-agnostic
│   (packages/    │  semantic model
│    core/)       │
└────────┬────────┘
         │ lower
         ▼
┌─────────────────┐
│ Lowering        │  Transform through
│ Pipeline        │  compiler phases
└────────┬────────┘
         │ serialize
         ├─────────┬─────────┐
         ▼         ▼         ▼
    CloudForm  Terraform  ARM/Bicep
```

## Key Features

- **Backend-neutral extraction**: Extract semantic model from AWS CDK constructs
- **Compiler-style lowering**: Transform IR through pluggable phases
- **Function conversion**: Auto-convert CloudFormation intrinsics to Terraform equivalents (via [cfncompat](https://github.com/cdktn-io/terraform-provider-cfncompat))
- **Multiple serializers**: Generate CloudFormation, Terraform, ARM, or custom formats

## Quick Start

```bash
# Install dependencies
npm install

# Build packages
npm run build

# Run tests
npm test
```

## Package Structure

- `packages/core/` - Core IR model, lowering pipeline, serializers
- `packages/aws-cdk/` - AWS CDK extractor
- `docs/` - Design docs and analysis

## Design Principles

1. **Semantic before syntactic** - Model infrastructure meaning, not deployment syntax
2. **Backend neutrality** - Deployment engines are implementation details
3. **Separation of concerns** - Extraction → Lowering → Serialization
4. **Extensibility** - Add phases and serializers without modifying core

## Status

Proof-of-concept implementation. Demonstrates:
- ✅ AWS CDK L2 → Shared IIR extraction
- ✅ CloudFormation intrinsic function conversion
- ✅ Multi-backend serialization (CloudFormation + Terraform)
- ✅ Compiler-style lowering pipeline

## Documentation

- [Common Denominator Analysis](docs/common-denominator-analysis.md) - Architecture rationale
- [Integration Strategy](docs/integration-strategy.md) - Implementation approach
- [Package README](packages/README.md) - Package details

## Relationship with RFCs

This repository validates architectural concepts for:
- [RFC-006 Backend-Neutral Synthesis](https://github.com/cdktn-io/terraform-provider-cfncompat/pull/8)
- [RFC-06 Shared IIR](https://github.com/open-constructs/cdktn-planning/pull/2)

## License

Provided for experimentation and architectural discussion.
