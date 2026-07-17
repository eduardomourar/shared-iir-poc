# Shared IIR v2: Summary

This directory contains the design and implementation of Shared IIR v2, a major evolution toward a truly platform-agnostic intermediate representation for infrastructure as code.

## What Changed in v2?

**TL;DR:** v2 makes the IIR generic enough to work across any infrastructure platform, not just AWS/CloudFormation.

### Key Improvements

1. **Rich Expression System** (3 types → 15+ types)
   - Binary operations (`x + y`, `a && b`)
   - Property/index access (`obj.prop`, `arr[0]`)
   - Conditionals (`cond ? true : false`)
   - Template strings (`"Hello ${name}"`)
   - For expressions (comprehensions)

2. **Comprehensive Resource Options**
   - Provider, parent, dependencies
   - Lifecycle options (protect, ignore changes, retain on delete)
   - Timeouts, aliases, import support

3. **First-Class Components**
   - Reusable infrastructure patterns
   - Inline, external, or provider-native implementations
   - Proper composition model

4. **Explicit Type System**
   - Structured types (primitives, collections, objects, unions)
   - Type checking during lowering
   - Better error messages

5. **Scoping and Variables**
   - Configuration inputs (program parameters)
   - Local variables (computed values)
   - Lexical scoping (program → component → block)

6. **Built-in Function Registry**
   - 50+ standard functions (string, collection, encoding, hash, etc.)
   - Platform-agnostic definitions
   - Backend-specific implementations

7. **Provider Functions (Invoke/Call)**
   - Data source queries (Invoke)
   - Resource method calls (Call)

## Files

- **[pcl-comparison.md](./pcl-comparison.md)** — Gap analysis vs Pulumi PCL
- **[IIR-V2-SPEC.md](./IIR-V2-SPEC.md)** — Complete v2 specification with examples
- **[MIGRATION-GUIDE-V2.md](./MIGRATION-GUIDE-V2.md)** — How to migrate from v1 to v2

## Implementation

The v2 types are implemented in `packages/core/src/`:

- `expression-v2.ts` — Enhanced expression system
- `resource-v2.ts` — Resource and component model with options
- `scope.ts` — Scoping and variable model
- `builtin-functions.ts` — Built-in function registry
- `manifest-v2.ts` — Complete program manifest

## Why v2?

The original IIR (v1) was too CloudFormation-centric. It worked for AWS CDK → CloudFormation/Terraform conversion but wasn't generic enough for:

- Multi-cloud scenarios (Azure, GCP)
- Non-CDK sources (Pulumi, native Terraform)
- Advanced features (data sources, components, type checking)

v2 is inspired by Pulumi's PCL (Pulumi Configuration Language), which is the gold standard for platform-agnostic infrastructure IRs.

## Next Steps

1. **Implement adapters** (v1 ↔ v2 conversion)
2. **Migrate extractors** (AWS CDK → v2)
3. **Migrate serializers** (v2 → CloudFormation/Terraform)
4. **Add type checking** lowering phase
5. **Validate** with real-world CDK apps

## Status

✅ **Design complete** — All v2 types and concepts defined  
🚧 **Implementation in progress** — Core types implemented, adapters/extractors/serializers pending  
📝 **Documentation complete** — Spec, comparison, and migration guide written  

See [GitHub Issues](#) for tracking.
