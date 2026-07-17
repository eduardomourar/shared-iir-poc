# Shared IIR vs Pulumi PCL: Gap Analysis

## Executive Summary

This document compares the current Shared IIR with Pulumi's PCL (Pulumi Configuration Language) to identify architectural gaps and inform the evolution toward a truly platform-agnostic intermediate representation.

**Key findings:**
- Current IIR is too CloudFormation-centric (only Literal/Reference/FunctionCall expressions)
- Missing critical PCL concepts: scoping, variables, components, invoke/call, resource options
- Type system is implicit rather than explicit
- Expression model is too limited for cross-platform code generation

---

## 1. Expression System

### Current State (Shared IIR)
```typescript
type Expression =
  | LiteralExpression        // { kind: 'Literal', literalValue: any }
  | ReferenceExpression      // { kind: 'Reference', reference: Reference }
  | FunctionCallExpression;  // { kind: 'FunctionCall', functionName, arguments }
```

**Limitations:**
- Cannot represent property access (`obj.prop`)
- Cannot represent index access (`arr[0]`)
- Cannot represent binary operations (`x + y`)
- Cannot represent conditional expressions (`cond ? a : b`)
- Cannot represent template strings
- Cannot represent object/array literals with computed values

### PCL Approach
PCL supports rich expression types via HCL2:
- Property access: `resource.property.nested`
- Index access: `list[0]`, `map["key"]`
- Binary operators: `+`, `-`, `*`, `/`, `&&`, `||`, `==`, `!=`
- Unary operators: `!`, `-`
- Conditional: `condition ? true_val : false_val`
- Template strings: `"Hello ${name}"`
- Function calls: `toJSON(obj)`, `filebase64("path")`
- Collection literals: `[1, 2, 3]`, `{key = value}`
- For expressions: `[for x in list : upper(x)]`

**Gap:** Need 10+ additional expression types to match PCL expressiveness.

---

## 2. Resource Model

### Current State (Shared IIR)
```typescript
interface IirResource {
  id: string;
  resourceType: ResourceType;
  properties: Record<string, Expression>;
  dependencies: Dependency[];
  conditionId?: string;  // Only resource option!
}
```

**Limitations:**
- Only one resource option: `conditionId`
- No distinction between resources and components
- No provider specification
- No parent/child relationships
- No lifecycle options (protect, ignore changes, delete before replace)

### PCL Approach
```hcl
resource "r" "pkg:index:Resource" {
    name = "r"
    
    options {
        provider = customProvider
        parent = parentComponent
        dependsOn = [otherResource]
        protect = true
        ignoreChanges = ["tags"]
        deleteBeforeReplace = true
        retainOnDelete = true
        customTimeouts {
            create = "30m"
            update = "20m"
            delete = "10m"
        }
    }
}
```

**Gap:** Need comprehensive resource options model.

---

## 3. Component Resources

### Current State (Shared IIR)
❌ **No component concept** — only flat resources

### PCL Approach
```hcl
component "c" "./component-dir" {
    inputProp = "value"
    
    options {
        provider = customProvider
    }
}
```

Components in PCL:
- Define reusable infrastructure patterns
- Reference local PCL programs as implementations
- Support nesting and composition
- Generate as local component classes in target languages

**Gap:** Need first-class component resource type.

---

## 4. Invokes and Calls

### Current State (Shared IIR)
❌ **No invoke/call support** — Cannot represent:
- Data sources (Terraform)
- Provider functions (Pulumi)
- Resource methods

### PCL Approach

**Invoke** (provider functions):
```hcl
result = invoke("aws:ec2/getAmi:getAmi", {
    filters = [{ name = "name", values = ["ubuntu-*"] }]
})

instance = aws:ec2/instance:Instance {
    ami = result.id
}
```

**Call** (resource methods):
```hcl
resource "cluster" "aws:eks/cluster:Cluster" { ... }

kubeconfig = call(cluster, "getKubeconfig", {})
```

**Gap:** Need InvokeExpression and CallExpression types.

---

## 5. Scoping and Variables

### Current State (Shared IIR)
❌ **No scoping model** — All resources and outputs are global
❌ **No local variables** — Cannot represent intermediate computations
❌ **No configuration inputs** — Cannot represent parameterized programs

### PCL Approach

**Configuration:**
```hcl
config "region" "string" {
    description = "AWS region to deploy to"
    default = "us-west-2"
}
```

**Local variables** (implicit):
```hcl
ami = invoke("aws:ec2/getAmi:getAmi", {...})
// ami is bound in scope, reusable
```

**Scoping:**
- Program-level scope
- Component-level scope
- Block-level scope (for expressions)

**Gap:** Need explicit scoping model and variable bindings.

---

## 6. Type System

### Current State (Shared IIR)
```typescript
interface Reference {
  targetResourceId: string;
  attributePath: string[];
  expectedType: string;  // ← String-based, not structured
}
```

**Limitations:**
- Types are strings, not structured types
- No type checking during lowering
- Cannot represent complex types (unions, objects, lists)
- Cannot validate type compatibility

### PCL Approach
PCL has full type system:
- Primitives: `string`, `number`, `bool`, `int`
- Collections: `list(T)`, `map(T)`, `set(T)`
- Objects: `object({key = type, ...})`
- Unions: `union(string, number)`
- Any: `dynamic`
- Resource types: from schema
- Output types: `Output<T>` (async values)

Type checking during binding phase ensures:
- Property access is valid
- Function arguments match signatures
- Resource inputs match schema

**Gap:** Need structured type system with type checking.

---

## 7. Output Model

### Current State (Shared IIR)
```typescript
interface Output {
  name: string;
  value: Expression;
}
```

✅ **Adequate** — Maps well to PCL's output blocks

### PCL Approach
```hcl
output "url" {
    value = website.endpoint
}
```

**Minor gap:** Could add description, sensitive flag.

---

## 8. Built-in Functions

### Current State (Shared IIR)
- `FunctionCallExpression` exists
- No standard function registry
- Functions are backend-specific (Fn::Join, Fn::Split)

### PCL Approach
PCL defines standard built-ins available in all programs:
- `toJSON(obj)` — Serialize to JSON string
- `filebase64(path)` — Read file as base64
- `filebase64sha256(path)` — Hash of file
- `range(n)` — Generate list [0..n)
- `readFile(path)` — Read file as string
- `readDir(path)` — List directory
- `toBase64(str)` — Encode string
- `fromBase64(str)` — Decode string
- `mimeType(path)` — Get MIME type
- `sha1(str)` — Hash functions
- `split(sep, str)` — String splitting
- `join(sep, list)` — String joining
- Standard operators: `+`, `&&`, `||`, etc.

**Gap:** Need standard function registry with cross-platform implementations.

---

## 9. Dependency Model

### Current State (Shared IIR)
```typescript
interface Dependency {
  sourceId: string;
  targetId: string;
  kind: 'explicit' | 'implicit';
}
```

✅ **Adequate** — Captures dependency graph

### PCL Approach
Dependencies in PCL are implicit (via references) or explicit (via `dependsOn` option).

**No gap** — Current model is sufficient, but should integrate with resource options.

---

## 10. Metadata and Annotations

### Current State (Shared IIR)
❌ **No metadata model** — Cannot attach:
- Source location (for error reporting)
- Comments/documentation
- Custom annotations

### PCL Approach
PCL tracks source locations for all nodes, enabling:
- Precise error messages
- Source mapping for generated code
- IDE support (go-to-definition, etc.)

**Gap:** Need source location tracking and metadata model.

---

## Recommended Evolution Path

### Phase 1: Expression System (Foundation)
1. Add property access, index access expressions
2. Add binary/unary operator expressions
3. Add conditional expression
4. Add template string expression
5. Add collection literal expressions
6. Add for/comprehension expressions

### Phase 2: Resource Options
1. Add comprehensive ResourceOptions interface
2. Extract provider, parent, dependsOn, protect, ignoreChanges
3. Update serializers to handle options

### Phase 3: Type System
1. Define structured Type model
2. Add type checking infrastructure
3. Add type inference for expressions
4. Validate during lowering

### Phase 4: Scoping & Variables
1. Add Scope model
2. Add Variable declarations
3. Add Configuration inputs
4. Update extractor to bind variables

### Phase 5: Components & Advanced
1. Add Component resource type
2. Add Invoke and Call expressions
3. Add built-in function registry
4. Add metadata/source location tracking

---

## Compatibility Strategy

To maintain backward compatibility during evolution:

1. **Additive changes** — Add new expression types, don't remove old ones
2. **Versioned serializers** — Old serializers continue to work with subset
3. **Progressive enhancement** — Features gracefully degrade if not supported
4. **Feature detection** — Serializers declare capabilities

Example:
```typescript
interface IBackendSerializer {
  id: string;
  capabilities: {
    supportsComponents: boolean;
    supportsInvoke: boolean;
    supportsComplexExpressions: boolean;
  };
  serialize(context: SerializationContext): AssemblyArtifact;
}
```

---

## Conclusion

The current Shared IIR is a good **starting point** but needs significant expansion to become truly platform-agnostic like PCL. The key gaps are:

1. **Expression system** — Too limited (3 types vs PCL's 15+)
2. **Resource options** — Missing most lifecycle options
3. **Type system** — Implicit, string-based, not validated
4. **Scoping** — No variables, configuration, or scope hierarchy
5. **Components** — No reusable composition primitive
6. **Invokes/Calls** — Cannot represent data sources or methods

The recommended approach is to evolve incrementally, starting with expressions (foundation) and building up to components and advanced features. Each phase should maintain backward compatibility and provide value independently.
