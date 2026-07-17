# Shared IIR v2: Implementation Roadmap

## Phase 1: Foundation ✅ COMPLETE

**Goal:** Define the v2 type system and architecture

- [x] Gap analysis vs Pulumi PCL
- [x] Enhanced expression system (15+ types)
- [x] Resource and component model with comprehensive options
- [x] Scoping and variable model
- [x] Built-in function registry (50+ functions)
- [x] Type system foundation
- [x] Enhanced manifest model
- [x] Complete specification document
- [x] Migration guide

**Deliverables:**
- ✅ `packages/core/src/expression-v2.ts`
- ✅ `packages/core/src/resource-v2.ts`
- ✅ `packages/core/src/scope.ts`
- ✅ `packages/core/src/builtin-functions.ts`
- ✅ `packages/core/src/manifest-v2.ts`
- ✅ `docs/pcl-comparison.md`
- ✅ `docs/IIR-V2-SPEC.md`
- ✅ `docs/MIGRATION-GUIDE-V2.md`

---

## Phase 2: Migration Adapters 🚧 NEXT

**Goal:** Enable interoperability between v1 and v2

**Tasks:**

### 2.1 V1 → V2 Conversion
- [ ] Create `convertV1ToV2()` function
- [ ] Map v1 expressions to v2 expressions
- [ ] Convert `conditionId` to `options.condition`
- [ ] Extract dependencies into `options.dependsOn`
- [ ] Generate minimal metadata and scopes
- [ ] Write unit tests

**File:** `packages/core/src/migration/v1-to-v2.ts`

### 2.2 V2 → V1 Conversion (Lossy)
- [ ] Create `convertV2ToV1()` function
- [ ] Drop components (can't represent in v1)
- [ ] Drop unsupported resource options
- [ ] Convert v2-only expressions to function calls or error
- [ ] Write unit tests
- [ ] Document feature loss

**File:** `packages/core/src/migration/v2-to-v1.ts`

### 2.3 Expression Visitor Pattern
- [ ] Implement `ExpressionVisitor` base class
- [ ] Create v1→v2 expression converter visitor
- [ ] Create v2→v1 expression converter visitor
- [ ] Handle all 15+ v2 expression types

**File:** `packages/core/src/migration/expression-converters.ts`

**Estimated Time:** 1-2 weeks

---

## Phase 3: Extractor Migration 🔜 FUTURE

**Goal:** Migrate AWS CDK extractor to v2 model

**Tasks:**

### 3.1 Enhanced Property Extraction
- [ ] Extract resource options from CDK constructs
- [ ] Extract `parent` from construct tree
- [ ] Extract `dependsOn` from node.dependencies
- [ ] Extract CFN conditions
- [ ] Extract protection/deletion policies

### 3.2 Configuration Extraction
- [ ] Extract CDK context values as configuration
- [ ] Type configuration variables
- [ ] Add descriptions from construct metadata

### 3.3 Component Detection
- [ ] Identify L2/L3 constructs as components
- [ ] Extract component implementation (child resources)
- [ ] Preserve component hierarchy

### 3.4 Scope Management
- [ ] Build scope hierarchy during extraction
- [ ] Bind variables to scopes
- [ ] Track resource outputs in scope

### 3.5 Output Extraction
- [ ] Extract CfnOutput resources
- [ ] Add descriptions and sensitivity flags
- [ ] Map to OutputValue model

**Files:**
- `packages/aws-cdk/src/extractor-v2.ts`
- `packages/aws-cdk/src/component-detector.ts`
- `packages/aws-cdk/src/scope-builder.ts`

**Estimated Time:** 2-3 weeks

---

## Phase 4: Serializer Migration 🔜 FUTURE

**Goal:** Update serializers to consume v2 manifests

**Tasks:**

### 4.1 CloudFormation Serializer v2
- [ ] Handle v2 expression types
  - [ ] PropertyAccess → nested GetAtt
  - [ ] Conditional → Fn::If
  - [ ] BinaryOperation → Fn::Equals, Fn::And, etc.
  - [ ] TemplateString → Fn::Sub
- [ ] Serialize resource options
  - [ ] `protect` → (metadata, no CFN equivalent)
  - [ ] `retainOnDelete` → DeletionPolicy
  - [ ] `dependsOn` → DependsOn
  - [ ] `condition` → Condition
- [ ] Expand components to resources
- [ ] Handle invoke (data sources → custom resources)
- [ ] Write tests comparing v1 vs v2 output

**File:** `packages/core/src/serializer/cloudformation-v2.ts`

### 4.2 Terraform Serializer v2
- [ ] Handle v2 expression types
  - [ ] PropertyAccess → nested access
  - [ ] Conditional → ternary
  - [ ] BinaryOperation → native operators
  - [ ] For → for expressions
- [ ] Serialize resource options
  - [ ] `protect` → lifecycle.prevent_destroy
  - [ ] `ignoreChanges` → lifecycle.ignore_changes
  - [ ] `customTimeouts` → timeouts block
  - [ ] `dependsOn` → depends_on
- [ ] Expand components to modules
- [ ] Handle invoke (→ data sources)
- [ ] Write tests

**File:** `packages/core/src/serializer/terraform-v2.ts`

### 4.3 ARM Serializer v2
- [ ] Same pattern as CloudFormation/Terraform
- [ ] Map v2 expressions to ARM functions
- [ ] Handle resource options

**File:** `packages/core/src/serializer/arm-v2.ts`

**Estimated Time:** 3-4 weeks

---

## Phase 5: Lowering Phases 🔜 FUTURE

**Goal:** Add v2-specific transformation phases

**Tasks:**

### 5.1 Type Checking Phase
- [ ] Infer expression types
- [ ] Validate property types against resource schema
- [ ] Validate function arguments
- [ ] Report type mismatches with source locations

**File:** `packages/core/src/lowering/phases/type-check.ts`

### 5.2 Component Expansion Phase
- [ ] Expand inline components to resources
- [ ] Resolve external component references
- [ ] Flatten component hierarchy

**File:** `packages/core/src/lowering/phases/component-expansion.ts`

### 5.3 Expression Simplification Phase
- [ ] Constant folding
- [ ] Dead code elimination
- [ ] Conditional simplification

**File:** `packages/core/src/lowering/phases/simplify-expressions.ts`

### 5.4 Scope Resolution Phase
- [ ] Resolve all variable references
- [ ] Replace variables with values or references
- [ ] Validate no undefined variables

**File:** `packages/core/src/lowering/phases/scope-resolution.ts`

**Estimated Time:** 2-3 weeks

---

## Phase 6: Testing & Validation 🔜 FUTURE

**Goal:** Ensure v2 works correctly across use cases

**Tasks:**

### 6.1 Unit Tests
- [ ] Expression conversion (v1↔v2)
- [ ] Resource option serialization
- [ ] Component expansion
- [ ] Type checking
- [ ] Scope resolution

### 6.2 Integration Tests
- [ ] Extract real CDK apps with v2 extractor
- [ ] Serialize to CloudFormation and compare with v1
- [ ] Serialize to Terraform and validate
- [ ] Test v2-specific features (components, invokes, for)

### 6.3 Compatibility Tests
- [ ] v1 manifests convert to v2 losslessly
- [ ] v2 manifests degrade to v1 predictably
- [ ] Side-by-side testing (v1 and v2 produce equivalent output)

**Estimated Time:** 2 weeks

---

## Phase 7: Documentation & Examples 🔜 FUTURE

**Goal:** Help users adopt v2

**Tasks:**

### 7.1 Examples
- [ ] Simple v2 manifest (S3 bucket)
- [ ] Component example (VPC)
- [ ] For expression example (multi-AZ)
- [ ] Invoke example (AMI lookup)
- [ ] Configuration example (parameterized stack)

### 7.2 Guides
- [ ] "Getting Started with v2"
- [ ] "Writing Custom Extractors"
- [ ] "Writing Custom Serializers"
- [ ] "Writing Lowering Phases"

### 7.3 API Documentation
- [ ] Generate TypeDoc from v2 types
- [ ] Add JSDoc comments to all interfaces

**Estimated Time:** 1 week

---

## Phase 8: Deprecation & Cleanup 📅 LONG-TERM

**Goal:** Remove v1 after grace period

**Tasks:**
- [ ] Mark v1 APIs as deprecated
- [ ] Set sunset date (e.g., 6 months after v2 GA)
- [ ] Remove v1 code after sunset
- [ ] v2 becomes the only version

**Estimated Time:** TBD (depends on adoption)

---

## Summary

| Phase | Status | Duration | Start Date | End Date |
|-------|--------|----------|------------|----------|
| 1. Foundation | ✅ Complete | 2 weeks | - | 2026-07-17 |
| 2. Migration Adapters | 🚧 Next | 1-2 weeks | TBD | TBD |
| 3. Extractor Migration | 🔜 Future | 2-3 weeks | TBD | TBD |
| 4. Serializer Migration | 🔜 Future | 3-4 weeks | TBD | TBD |
| 5. Lowering Phases | 🔜 Future | 2-3 weeks | TBD | TBD |
| 6. Testing & Validation | 🔜 Future | 2 weeks | TBD | TBD |
| 7. Documentation & Examples | 🔜 Future | 1 week | TBD | TBD |
| 8. Deprecation & Cleanup | 📅 Long-term | TBD | TBD | TBD |

**Total Estimated Time:** 13-18 weeks (~3-4 months) from Phase 2 start

---

## Current Status: Phase 1 Complete! 🎉

All v2 type definitions, specifications, and documentation are complete. The foundation is ready for implementation.

**Next Action:** Begin Phase 2 (Migration Adapters) to enable v1↔v2 interoperability.
