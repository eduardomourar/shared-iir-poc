# Shared Infrastructure Intermediate Representation (Shared IIR)

> A proof-of-concept implementation of a backend-neutral Intermediate Representation (IR) for infrastructure synthesis.

```
                    Construct Tree
                          │
                          ▼
          Shared Infrastructure IR (Public)
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
     AWS Internal IR                Azure Internal IR
          │                               │
          └───────────────┬───────────────┘
                          ▼
                   Cloud Assembly
                          │
                   Serializer Registry
          ┌───────────────┼──────────────────┐
          ▼               ▼                  ▼
    CloudFormation     Terraform           ARM/Bicep
```

---

## Overview

This repository explores a new synthesis architecture that decouples infrastructure modeling from deployment backends.

Today, most Infrastructure as Code (IaC) frameworks tightly couple synthesis with a specific deployment engine:

- AWS CDK → CloudFormation
- CDKTN → Terraform
- Pulumi → Pulumi Engine

This project investigates an alternative architecture where infrastructure is first represented as a deployment-engine-neutral semantic model before being translated into one or more deployment targets.

The long-term objective is to demonstrate that a single construct tree can synthesize to multiple deployment engines while preserving semantic intent.

Examples include:

```
Construct Tree
        │
        ▼
Shared Infrastructure IR
        │
        ▼
AWS Internal IR
        │
        ▼
CloudFormation

Terraform
```

or

```
Construct Tree
        │
        ▼
Shared Infrastructure IR
        │
        ▼
Azure Internal IR
        │
        ▼
Terraform

ARM

Bicep
```

The Shared IIR is intentionally designed to represent infrastructure semantics rather than deployment syntax.

---

# Motivation

CloudFormation, Terraform, ARM and other deployment engines all describe infrastructure using different configuration languages.

Although their syntax differs significantly, many of the underlying concepts are identical:

- object storage
- virtual networks
- virtual machines
- identity
- messaging
- encryption
- versioning
- replication

Current synthesis architectures usually translate constructs directly into deployment-specific representations.

This project instead investigates introducing an intermediate semantic representation between constructs and deployment artifacts.

Benefits include:

- backend-neutral synthesis
- reusable optimizations
- reusable validation
- reusable semantic analysis
- simplified serializers
- support for multiple deployment engines
- clearer architectural boundaries

---

# Relationship with the RFCs

This repository serves as a proof-of-concept for several RFCs currently under development.

## AWS Compatibility RFCs (https://github.com/cdktn-io/terraform-provider-cfncompat/pull/8)

- RFC-006 Backend-Neutral Synthesis Architecture

## CDKTN Planning RFCs (https://github.com/open-constructs/cdktn-planning/pull/2)

- RFC-06 Shared Infrastructure Intermediate Representation
- RFC-07 Azure Integration

The repository intentionally evolves alongside those RFCs and is expected to validate architectural decisions before larger implementations are proposed.

---

# Current Architecture

The current architecture follows a compiler-inspired pipeline.

```
Construct Tree
        │
        ▼
Shared Infrastructure Intermediate Representation
        │
        ▼
Platform Intermediate Representation
        │
        ▼
Cloud Assembly
        │
        ▼
Serializer Registry
        │
   ┌────┼────────────┐
   ▼    ▼            ▼
  CFN   TF          ARM
```

Each layer owns a single responsibility.

## Shared Infrastructure IR

The Shared Infrastructure IR represents cloud-neutral infrastructure semantics.

It intentionally contains no deployment-engine-specific concepts.

Examples include:

- resources
- properties
- expressions
- outputs
- semantic capabilities

The Shared IR is expected to become the common semantic contract shared across multiple construct ecosystems.

---

## Platform Internal IR

Each platform extends the Shared IR with platform-specific implementation details.

Examples include:

- AWS Internal IR
- Azure Internal IR

These remain implementation details and are not intended as public APIs.

---

## Cloud Assembly

Cloud Assembly packages the synthesized output together with metadata required by deployment backends.

It may eventually contain:

- semantic models
- deployment artifacts
- diagnostics
- metadata
- assets
- provenance information

This layer intentionally mirrors the responsibilities of the AWS CDK Cloud Assembly while remaining backend-neutral.

---

## Serializer Registry

Deployment engines are implemented as independent serializers.

Examples include:

- CloudFormation
- Terraform
- ARM
- Bicep
- Mock Serializer

Serializers consume semantic models and generate deployment artifacts.

They should contain no semantic transformations.

---

# Long-Term Vision

The current proof-of-concept intentionally stops before introducing a lowering pipeline.

The long-term architecture under discussion extends the current design with compiler-style lowering phases.

```
Construct Tree
        │
        ▼
Shared Infrastructure IR
        │
        ▼
Lowering Pipeline
        │
        ▼
Platform Internal IR
        │
        ▼
Cloud Assembly
        │
        ▼
Serializer Registry
        │
        ▼
Deployment Artifacts
```

This allows semantic transformations to occur independently from serialization.

Examples include:

- feature expansion
- provider feature resolution
- optimization
- validation
- diagnostics

Serializers then become simple code generators.

---

# Repository Layout

```
src/

assembly/
    ...

iir/
    shared/
    aws/
    azure/

serializers/

demo/
```

The project intentionally mirrors the architectural layering proposed by the RFCs.

---

# Development Roadmap

The proof-of-concept is being developed incrementally.

## Phase 1

Repository organization

- Repository structure
- Shared IIR package
- Platform IR packages

## Phase 2

Core architecture

- Shared semantic model
- Platform-specific models
- Cloud Assembly
- Serializer abstraction

## Phase 3

Semantic infrastructure

- Rich expression tree
- Semantic capabilities
- Provider feature integration

## Phase 4

Compilation pipeline

- Lowering pipeline
- Optimization
- Validation
- Diagnostics

## Phase 5

Reference implementations

- Storage
- Identity
- Networking
- Compute

---

# Design Principles

The project follows a few important principles.

## Semantic before syntactic

The IR models infrastructure semantics rather than deployment syntax.

## Backend neutrality

Deployment engines are implementation details.

## Extensibility

New deployment backends should be introduced without modifying the Shared IR.

## Separation of responsibilities

Each architectural layer owns a single concern.

## Composition over inheritance

Platform-specific models compose the Shared IR instead of replacing it.

---

# Current Status

This repository is an architectural proof-of-concept.

Many components currently exist only as structural placeholders.

This is intentional.

The objective is to validate architecture before introducing production-ready implementations.

---

# Inspiration

Several existing projects influenced the architecture explored here.

- AWS CDK Cloud Assembly
- CDKTN
- Azure Terraform CDK Constructs
- cdk-from-cfn
- pulumi-tool-cdk2pulumi
- LLVM
- Roslyn
- Rust Compiler

This project does **not** aim to replace these systems, but rather to explore how similar compiler architecture concepts can be applied to infrastructure synthesis.

---

# License

This repository is provided for experimentation and architectural discussion.
