# Overall Instructions

# Project overview
- Language: TypeScript (ES 2023 target, JSII-compatible subset)
- Runtime: Node.js 24 (uses native type-stripping for .ts execution)
- Package manager: npm
- Build: JSII (`npm run build` → `jsii --silence-warnings reserved-word`)
- Testing: Native Node.js Test Runner
- Linting: ESLint + Stylistic
- Module system: ESM (`"type": "module"`)

# Repository structure
- /src/iir/shared → Shared Infrastructure Intermediate Representation (public semantic contract)
- /src/iir/aws → AWS Internal IR (platform-specific extensions)
- /src/iir/azure → Azure Internal IR (platform-specific extensions)
- /src/assembly → Cloud Assembly (synthesis output packaging)
- /src/serializers → Backend serializers (CloudFormation, Terraform, ARM, Mock)
- /src/lowering → Lowering pipeline (compiler-style transformation phases)
- /src/demo → End-to-end demonstration
- /lib → Compiled output (gitignored)

# Architecture (compiler-inspired pipeline)
```
Construct Tree → Shared IIR → Lowering Pipeline → Platform IR → Cloud Assembly → Serializer Registry → Deployment Artifacts
```

# JSII constraints (critical — build will fail without these)
- No `enum` keyword — use `as const` objects with derived type
- No `readonly T[]` in exported interfaces — use `T[]` instead
- No generics on exported interfaces or classes
- No inline object literal types in exported signatures — extract to named interfaces
- Behavioral interfaces (with methods) must use `I` prefix (e.g., `IBackendSerializer`)
- Data-only interfaces do NOT use `I` prefix (e.g., `Expression`, `IirResource`)
- No covariant return types when implementing interfaces
- No method names like `getXxx` (conflicts with Java property getters) — use `listXxx`, `findXxx`, etc.
- No TypeScript parameter properties (`constructor(readonly x: string)`) — assign in body

# Node.js strip-mode constraints (for `node src/demo/main.ts`)
- No `enum` (use `as const` objects)
- No parameter properties
- No namespaces
- Use `import type` for interface-only imports (avoids empty module errors at runtime)

# Coding conventions
- Prefer composition over inheritance (Platform IR wraps Shared IIR, not extends)
- Use `import type` for all type-only imports
- Each package has a barrel `index.ts` re-exporting its public API
- Serializers consume `SerializationContext`, return `AssemblyArtifact`
- Lowering phases implement `ILoweringPhase` and are pure transformations
- Expression handling uses visitor pattern (`IExpressionVisitor`)
- Keep semantic model deployment-engine-neutral; backend logic lives only in serializers

# Key interfaces
- `IirResource` — semantic resource in the Shared IIR
- `SharedIirManifest` — top-level shared semantic model
- `IBackendSerializer` — serializer contract (id, displayName, serialize)
- `ILoweringPhase` — single compiler pass (id, displayName, run)
- `CloudAssembly` — packaged synthesis output
- `ProviderFeatureRegistry` — maps semantic capabilities to provider features

# Expectations
- Do NOT invent files or APIs
- Ask before introducing new dependencies
- Match existing patterns exactly
- Provide minimal diffs when editing code
- Ignore files listed in .gitignore
- Always run `npm run build` after changes to verify JSII compatibility
- Run `node src/demo/main.ts` to verify runtime behavior

# Standing rules
- If unsure, ask a clarification question instead of guessing
- Prefer editing existing code over rewriting
- Never simplify types for convenience
- Assume production-quality standards
- When adding new resources: define in shared IIR → add lowering phase → implement in serializers
- When adding new serializers: implement `IBackendSerializer`, register in demo
