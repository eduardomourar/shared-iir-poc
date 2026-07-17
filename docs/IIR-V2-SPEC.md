# Shared IIR v2 Specification

> A platform-agnostic intermediate representation for infrastructure as code, inspired by Pulumi PCL and compiler design principles.

## Table of Contents

1. [Introduction](#introduction)
2. [Design Philosophy](#design-philosophy)
3. [Core Concepts](#core-concepts)
4. [Expression System](#expression-system)
5. [Resource Model](#resource-model)
6. [Type System](#type-system)
7. [Scoping and Variables](#scoping-and-variables)
8. [Built-in Functions](#built-in-functions)
9. [Program Manifest](#program-manifest)
10. [Examples](#examples)

---

## Introduction

Shared IIR v2 is an intermediate representation designed to capture infrastructure programs in a platform-agnostic manner. It serves as a compilation target for high-level frameworks (AWS CDK, Pulumi, Terraform CDK) and as a source for backend-specific code generation (CloudFormation, Terraform, ARM, etc.).

### Goals

1. **Platform Neutrality** — No backend-specific concepts in the core model
2. **Expressiveness** — Rich enough to represent complex infrastructure patterns
3. **Type Safety** — Explicit type system for validation and tooling
4. **Composability** — First-class support for reusable components
5. **Debuggability** — Source location tracking for error reporting

### Non-Goals

1. **Turing Completeness** — IIR is declarative, not a general-purpose programming language
2. **Runtime Execution** — IIR is a compile-time representation, not executable
3. **UI Specification** — IIR describes infrastructure, not user interfaces

---

## Design Philosophy

### 1. Compiler-Inspired Architecture

Shared IIR follows a multi-phase compiler architecture:

```
Source Language → Frontend → IIR → Lowering → Backend → Target
```

- **Frontend (Extractor):** Parse source language → IIR
- **Lowering (Optimizer):** Transform IIR → IIR (multiple passes)
- **Backend (Serializer):** Emit target language from IIR

### 2. Semantic Model, Not Syntax

IIR represents **what** infrastructure should exist, not **how** it's expressed:

```typescript
// NOT: CloudFormation syntax in IIR
{ "Fn::GetAtt": ["Bucket", "Arn"] }

// YES: Semantic reference in IIR
{
  kind: 'Reference',
  reference: { targetResourceId: 'Bucket', attributePath: ['Arn'] }
}
```

Backends translate the semantic model to their syntax.

### 3. Separation of Concerns

| Layer | Responsibility | Examples |
|-------|----------------|----------|
| **Extractor** | Source → IIR | AWS CDK → IIR, Pulumi → IIR |
| **Lowering** | IIR → IIR transforms | Type checking, optimization, validation |
| **Serializer** | IIR → Target | IIR → CloudFormation, IIR → Terraform |

Each layer is independent and pluggable.

### 4. Inspired by Pulumi PCL

Shared IIR v2 adopts concepts from Pulumi's Configuration Language (PCL):

- Rich expression types
- Scoping and variables
- Component resources
- Invoke/call semantics
- Explicit type system

Key differences:
- IIR is in-memory (not text-based like PCL)
- IIR is language-agnostic (PCL targets specific languages)
- IIR is extensible (custom expression types, resource options)

---

## Core Concepts

### Resource

A **resource** is a single infrastructure entity managed by a provider:

```typescript
interface IirResource {
  kind: 'Resource';
  id: string;                               // Unique identifier
  resourceType: ResourceType;               // Provider/service/resource
  properties: Record<string, Expression>;   // Input properties
  options?: ResourceOptions;                // Lifecycle options
}
```

**Example:** AWS S3 Bucket

```typescript
const bucket: IirResource = {
  kind: 'Resource',
  id: 'MyBucket',
  resourceType: { provider: 'aws', service: 's3', resource: 'bucket' },
  properties: {
    bucketName: literal('my-app-bucket'),
    versioning: { kind: 'ObjectLiteral', properties: { enabled: literal(true) } },
  },
  options: {
    protect: true,
    ignoreChanges: ['tags'],
  },
};
```

### Component

A **component** is a reusable infrastructure pattern composed of multiple resources:

```typescript
interface IirComponent {
  kind: 'Component';
  id: string;
  resourceType: ResourceType;
  properties: Record<string, Expression>;
  implementation?: ComponentImplementation;
  options?: ResourceOptions;
}
```

**Example:** VPC Component

```typescript
const vpc: IirComponent = {
  kind: 'Component',
  id: 'MyVpc',
  resourceType: { provider: 'aws', service: 'ec2', resource: 'vpc' },
  properties: {
    cidrBlock: literal('10.0.0.0/16'),
    maxAzs: literal(2),
  },
  implementation: {
    type: 'inline',
    resources: [
      /* VPC resource, subnets, route tables, etc. */
    ],
  },
};
```

### Expression

An **expression** represents a computed value:

```typescript
type Expression =
  | LiteralExpression          // Static value
  | ReferenceExpression        // Resource attribute
  | BinaryOperationExpression  // x + y, a && b
  | ConditionalExpression      // cond ? true : false
  | FunctionCallExpression     // join(",", list)
  | InvokeExpression           // Data source query
  // ... 15+ types
```

Expressions are the building blocks of resource properties.

### Scope

A **scope** defines variable visibility:

```typescript
interface Scope {
  id: string;
  kind: 'program' | 'component' | 'block' | 'for';
  parent?: Scope;
  variables: Map<string, VariableBinding>;
  children: Scope[];
}
```

Scopes form a hierarchy for lexical scoping.

---

## Expression System

### Overview

Shared IIR v2 provides 15+ expression types organized into categories:

| Category | Expression Types |
|----------|------------------|
| **Literals** | Literal, ObjectLiteral, ArrayLiteral, TemplateString |
| **References** | Reference, PropertyAccess, IndexAccess, Variable |
| **Operations** | BinaryOperation, UnaryOperation, Conditional |
| **Functions** | FunctionCall, Invoke, Call |
| **Advanced** | For (comprehension) |

### Literal Expressions

#### Literal (Primitive)

```typescript
interface LiteralExpression {
  kind: 'Literal';
  literalValue: string | number | boolean | null;
}
```

**Examples:**
```typescript
literal('hello')           // String
literal(42)                // Number
literal(true)              // Boolean
literal(null)              // Null
```

#### ObjectLiteral (Map)

```typescript
interface ObjectLiteralExpression {
  kind: 'ObjectLiteral';
  properties: Record<string, Expression>;
}
```

**Example:**
```typescript
{
  kind: 'ObjectLiteral',
  properties: {
    enabled: literal(true),
    status: literal('Active'),
    count: binaryOp('+', literal(5), literal(3)),
  },
}
// Represents: { enabled: true, status: "Active", count: 5 + 3 }
```

#### ArrayLiteral (List)

```typescript
interface ArrayLiteralExpression {
  kind: 'ArrayLiteral';
  elements: Expression[];
}
```

**Example:**
```typescript
{
  kind: 'ArrayLiteral',
  elements: [literal('a'), literal('b'), literal('c')],
}
// Represents: ["a", "b", "c"]
```

#### TemplateString (Interpolation)

```typescript
interface TemplateStringExpression {
  kind: 'TemplateString';
  parts: TemplateStringPart[];
}

type TemplateStringPart =
  | { type: 'literal'; value: string }
  | { type: 'interpolation'; expression: Expression };
```

**Example:**
```typescript
{
  kind: 'TemplateString',
  parts: [
    { type: 'literal', value: 'Hello ' },
    { type: 'interpolation', expression: { kind: 'Variable', name: 'name' } },
    { type: 'literal', value: '!' },
  ],
}
// Represents: "Hello ${name}!"
```

### Reference Expressions

#### Reference (Resource Attribute)

```typescript
interface ReferenceExpression {
  kind: 'Reference';
  reference: Reference;
}

interface Reference {
  targetResourceId: string;
  attributePath: string[];
  expectedType?: Type;
}
```

**Example:**
```typescript
reference('MyBucket', ['Arn'])
// Refers to: MyBucket.Arn
```

#### PropertyAccess (Nested Access)

```typescript
interface PropertyAccessExpression {
  kind: 'PropertyAccess';
  object: Expression;
  property: string;
}
```

**Example:**
```typescript
{
  kind: 'PropertyAccess',
  object: reference('MyInstance'),
  property: 'privateIp',
}
// Represents: MyInstance.privateIp
```

#### IndexAccess (Array/Map Access)

```typescript
interface IndexAccessExpression {
  kind: 'IndexAccess';
  collection: Expression;
  index: Expression;
}
```

**Examples:**
```typescript
// Array access: list[0]
{
  kind: 'IndexAccess',
  collection: { kind: 'Variable', name: 'list' },
  index: literal(0),
}

// Map access: map["key"]
{
  kind: 'IndexAccess',
  collection: { kind: 'Variable', name: 'map' },
  index: literal('key'),
}
```

#### Variable (Local/Config Variable)

```typescript
interface VariableExpression {
  kind: 'Variable';
  name: string;
  scope?: string;
}
```

**Example:**
```typescript
{ kind: 'Variable', name: 'region' }
// Refers to: variable "region"
```

### Operation Expressions

#### BinaryOperation

```typescript
interface BinaryOperationExpression {
  kind: 'BinaryOperation';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

type BinaryOperator =
  | '+' | '-' | '*' | '/' | '%'          // Arithmetic
  | '==' | '!=' | '<' | '<=' | '>' | '>=' // Comparison
  | '&&' | '||'                          // Logical
  | '++';                                // String concat
```

**Examples:**
```typescript
// Arithmetic: count + 1
binaryOp('+', { kind: 'Variable', name: 'count' }, literal(1))

// Comparison: status == "ready"
binaryOp('==', { kind: 'Variable', name: 'status' }, literal('ready'))

// Logical: enabled && licensed
binaryOp('&&', { kind: 'Variable', name: 'enabled' }, { kind: 'Variable', name: 'licensed' })
```

#### UnaryOperation

```typescript
interface UnaryOperationExpression {
  kind: 'UnaryOperation';
  operator: '!' | '-';
  operand: Expression;
}
```

**Examples:**
```typescript
// Logical NOT: !enabled
{ kind: 'UnaryOperation', operator: '!', operand: { kind: 'Variable', name: 'enabled' } }

// Negation: -value
{ kind: 'UnaryOperation', operator: '-', operand: { kind: 'Variable', name: 'value' } }
```

#### Conditional (Ternary)

```typescript
interface ConditionalExpression {
  kind: 'Conditional';
  condition: Expression;
  trueValue: Expression;
  falseValue: Expression;
}
```

**Example:**
```typescript
// isProd ? "production" : "development"
conditional(
  { kind: 'Variable', name: 'isProd' },
  literal('production'),
  literal('development')
)
```

### Function Expressions

#### FunctionCall (Built-in Function)

```typescript
interface FunctionCallExpression {
  kind: 'FunctionCall';
  functionName: string;
  arguments: Expression[];
}
```

**Examples:**
```typescript
// join(",", ["a", "b", "c"])
functionCall('join', literal(','), { kind: 'ArrayLiteral', elements: [literal('a'), literal('b'), literal('c')] })

// upper("hello")
functionCall('upper', literal('hello'))
```

See [Built-in Functions](#built-in-functions) for complete list.

#### Invoke (Provider Function / Data Source)

```typescript
interface InvokeExpression {
  kind: 'Invoke';
  token: string;
  inputs: Record<string, Expression>;
  options?: InvokeOptions;
}
```

**Example: Get AWS AMI**
```typescript
{
  kind: 'Invoke',
  token: 'aws:ec2/getAmi:getAmi',
  inputs: {
    filters: {
      kind: 'ArrayLiteral',
      elements: [
        {
          kind: 'ObjectLiteral',
          properties: {
            name: literal('name'),
            values: { kind: 'ArrayLiteral', elements: [literal('ubuntu-*')] },
          },
        },
      ],
    },
  },
}
```

Maps to:
- **Terraform:** `data "aws_ami"`
- **Pulumi:** `aws.ec2.getAmi()`

#### Call (Resource Method)

```typescript
interface CallExpression {
  kind: 'Call';
  resourceId: string;
  methodName: string;
  arguments: Record<string, Expression>;
  options?: CallOptions;
}
```

**Example: Get EKS Kubeconfig**
```typescript
{
  kind: 'Call',
  resourceId: 'MyCluster',
  methodName: 'getKubeconfig',
  arguments: {},
}
```

Maps to resource method invocations.

### Advanced Expressions

#### For (Comprehension)

```typescript
interface ForExpression {
  kind: 'For';
  keyVariable?: string;
  valueVariable: string;
  collection: Expression;
  condition?: Expression;
  body: Expression;
  resultType: 'array' | 'object';
}
```

**Example: Transform Array**
```typescript
// [for item in list : upper(item)]
{
  kind: 'For',
  valueVariable: 'item',
  collection: { kind: 'Variable', name: 'list' },
  body: functionCall('upper', { kind: 'Variable', name: 'item' }),
  resultType: 'array',
}
```

**Example: Transform Object**
```typescript
// {for k, v in map : k => upper(v)}
{
  kind: 'For',
  keyVariable: 'k',
  valueVariable: 'v',
  collection: { kind: 'Variable', name: 'map' },
  body: functionCall('upper', { kind: 'Variable', name: 'v' }),
  resultType: 'object',
}
```

---

## Resource Model

### Resource Options

Resources can specify lifecycle and behavior options:

```typescript
interface ResourceOptions {
  dependsOn?: string[];              // Explicit dependencies
  provider?: string;                 // Custom provider instance
  parent?: string;                   // Parent resource (grouping)
  protect?: boolean;                 // Prevent deletion
  ignoreChanges?: string[];          // Ignore changes to properties
  deleteBeforeReplace?: boolean;     // Replace strategy
  retainOnDelete?: boolean;          // Keep resource after stack deletion
  customTimeouts?: CustomTimeouts;   // Operation timeouts
  condition?: string;                // Conditional creation
  aliases?: ResourceAlias[];         // For refactoring
  importId?: string;                 // Import existing resource
  replaceOnChanges?: string[];       // Force replacement on property change
}
```

### Component Implementation

Components can be implemented in three ways:

#### 1. Inline (Expanded in Manifest)

```typescript
{
  type: 'inline',
  resources: IirResourceOrComponent[]
}
```

The component's child resources are included directly in the manifest.

#### 2. External (Reference to Directory)

```typescript
{
  type: 'external',
  path: './components/vpc'
}
```

The component implementation is in a separate directory (similar to PCL components).

#### 3. Reference (Provider-Native Component)

```typescript
{
  type: 'reference',
  token: 'aws:ec2/vpc:Vpc'
}
```

The component is provided by a backend-native implementation.

---

## Type System

### Type Representation

```typescript
type Type =
  | PrimitiveType      // string, number, boolean, null
  | CollectionType     // array<T>, map<T>, set<T>
  | ObjectType         // { key: T, ... }
  | UnionType          // T1 | T2 | ...
  | ResourceType       // aws:s3/bucket:Bucket
  | OutputType         // Output<T> (async)
  | AnyType;           // dynamic
```

### Type Examples

```typescript
// Primitive
{ kind: 'Primitive', primitive: 'string' }

// Array
{ kind: 'Collection', collectionKind: 'array', elementType: { kind: 'Primitive', primitive: 'string' } }

// Object
{
  kind: 'Object',
  properties: {
    name: { kind: 'Primitive', primitive: 'string' },
    age: { kind: 'Primitive', primitive: 'number' },
  },
}

// Union
{
  kind: 'Union',
  types: [
    { kind: 'Primitive', primitive: 'string' },
    { kind: 'Primitive', primitive: 'number' },
  ],
}

// Resource
{ kind: 'Resource', token: 'aws:s3/bucket:Bucket' }

// Output (async)
{
  kind: 'Output',
  valueType: { kind: 'Primitive', primitive: 'string' },
}
```

### Type Checking

Types can be checked during lowering phases:

```typescript
class TypeCheckingPhase implements ILoweringPhase {
  run(manifest: SharedIirManifestV2, context: ILoweringContext): SharedIirManifestV2 {
    for (const resource of manifest.resources) {
      for (const [propName, propExpr] of Object.entries(resource.properties)) {
        const expectedType = this.getPropertyType(resource.resourceType, propName);
        const actualType = this.inferType(propExpr, manifest);
        
        if (!this.isAssignable(actualType, expectedType)) {
          throw new TypeError(`Property ${propName} expected ${formatType(expectedType)}, got ${formatType(actualType)}`);
        }
      }
    }
    
    return manifest;
  }
}
```

---

## Scoping and Variables

### Scope Hierarchy

```
program (root)
  ├─ component "Vpc"
  │    ├─ block (for expression)
  │    └─ block (conditional)
  └─ component "Database"
```

### Variable Kinds

```typescript
type VariableKind =
  | 'configuration'   // Program input (config "region")
  | 'local'           // Computed value (local ami = invoke(...))
  | 'loop'            // For expression variable (for item in list)
  | 'resource';       // Resource attribute reference
```

### Configuration Variables

```typescript
interface ConfigurationVariable {
  name: string;
  type: Type;
  description?: string;
  default?: Expression;
  sensitive?: boolean;
  validation?: ConfigurationValidation;
}
```

**Example:**
```typescript
{
  name: 'region',
  type: { kind: 'Primitive', primitive: 'string' },
  description: 'AWS region to deploy to',
  default: literal('us-west-2'),
  validation: {
    rules: [
      { kind: 'regex', pattern: '^[a-z]{2}-[a-z]+-\\d+$' },
    ],
  },
}
```

---

## Built-in Functions

Shared IIR defines a standard library of built-in functions that all backends should support.

### Categories

- **String:** join, split, upper, lower, trim, replace, substr, format
- **Collection:** length, concat, contains, distinct, flatten, keys, values, merge, lookup, slice
- **Numeric:** min, max, abs, ceil, floor, parseint
- **Encoding:** base64encode, base64decode, urlencode, jsondecode, jsonencode
- **Hash:** md5, sha1, sha256, sha512, bcrypt
- **Filesystem:** file, filebase64, fileexists, dirname, basename, abspath
- **Type:** tostring, tonumber, tobool, tolist, tomap, toset
- **DateTime:** timestamp, formatdate, timeadd

See [builtin-functions.ts](../packages/core/src/builtin-functions.ts) for complete reference.

### Example: String Functions

```typescript
// join(",", ["a", "b", "c"]) → "a,b,c"
functionCall('join', literal(','), arrayLiteral([literal('a'), literal('b'), literal('c')]))

// upper("hello") → "HELLO"
functionCall('upper', literal('hello'))

// split(",", "a,b,c") → ["a", "b", "c"]
functionCall('split', literal(','), literal('a,b,c'))
```

### Backend Mapping

| Function | CloudFormation | Terraform | Pulumi |
|----------|----------------|-----------|--------|
| `join` | `Fn::Join` | `join()` | `pulumi.interpolate` |
| `split` | `Fn::Split` | `split()` | `str.split()` |
| `upper` | (not available) | `upper()` | `str.upper()` |
| `length` | `Fn::Length` | `length()` | `len()` |

Serializers translate built-in functions to backend-native equivalents.

---

## Program Manifest

### Structure

```typescript
interface SharedIirManifestV2 {
  version: string;                           // "2.0.0"
  metadata: ProgramMetadata;                 // Name, description, tags
  configuration: ConfigurationVariable[];    // Config inputs
  resources: IirResourceOrComponent[];       // All resources
  outputs: OutputValue[];                    // Stack outputs
  rootScope: Scope;                          // Variable scoping
  providers?: ProviderReference[];           // Provider instances
  options?: ProgramOptions;                  // Program-level options
}
```

### Example: Complete Manifest

```typescript
const manifest: SharedIirManifestV2 = {
  version: '2.0.0',
  
  metadata: {
    name: 'my-app-stack',
    description: 'Production infrastructure for my-app',
    sourceFramework: 'aws-cdk',
    sourceFrameworkVersion: '2.150.0',
    tags: {
      environment: 'production',
      team: 'platform',
    },
  },
  
  configuration: [
    {
      name: 'region',
      type: { kind: 'Primitive', primitive: 'string' },
      description: 'AWS region',
      default: literal('us-west-2'),
    },
    {
      name: 'instanceCount',
      type: { kind: 'Primitive', primitive: 'number' },
      description: 'Number of instances',
      default: literal(2),
      validation: {
        rules: [{ kind: 'range', min: 1, max: 10 }],
      },
    },
  ],
  
  resources: [
    {
      kind: 'Resource',
      id: 'AppBucket',
      resourceType: { provider: 'aws', service: 's3', resource: 'bucket' },
      properties: {
        bucketName: literal('my-app-bucket'),
        versioning: { kind: 'ObjectLiteral', properties: { enabled: literal(true) } },
      },
      options: {
        protect: true,
        ignoreChanges: ['tags'],
      },
    },
  ],
  
  outputs: [
    {
      name: 'BucketArn',
      value: reference('AppBucket', ['Arn']),
      description: 'ARN of the application bucket',
    },
  ],
  
  rootScope: {
    id: 'program',
    kind: 'program',
    variables: new Map(),
    children: [],
  },
  
  providers: [
    {
      id: 'default-aws',
      type: 'aws',
      version: '>=5.0.0',
      config: {
        region: { kind: 'Variable', name: 'region' },
      },
    },
  ],
  
  options: {
    defaultResourceOptions: {
      protect: false,
      deleteBeforeReplace: false,
    },
    refresh: 'auto',
  },
};
```

---

## Examples

### Example 1: S3 Bucket with Conditional Encryption

```typescript
const manifest: SharedIirManifestV2 = {
  version: '2.0.0',
  metadata: { name: 'conditional-bucket' },
  
  configuration: [
    {
      name: 'enableEncryption',
      type: { kind: 'Primitive', primitive: 'boolean' },
      default: literal(false),
    },
  ],
  
  resources: [
    {
      kind: 'Resource',
      id: 'Bucket',
      resourceType: { provider: 'aws', service: 's3', resource: 'bucket' },
      properties: {
        bucketName: literal('my-bucket'),
        
        // Conditional encryption: enableEncryption ? { rules: [...] } : null
        serverSideEncryptionConfiguration: conditional(
          { kind: 'Variable', name: 'enableEncryption' },
          {
            kind: 'ObjectLiteral',
            properties: {
              rules: {
                kind: 'ArrayLiteral',
                elements: [
                  {
                    kind: 'ObjectLiteral',
                    properties: {
                      applyServerSideEncryptionByDefault: {
                        kind: 'ObjectLiteral',
                        properties: {
                          sseAlgorithm: literal('AES256'),
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          literal(null)
        ),
      },
    },
  ],
  
  outputs: [],
  rootScope: { id: 'program', kind: 'program', variables: new Map(), children: [] },
};
```

### Example 2: Component with For Expression

```typescript
const manifest: SharedIirManifestV2 = {
  version: '2.0.0',
  metadata: { name: 'multi-subnet-vpc' },
  
  configuration: [
    {
      name: 'availabilityZones',
      type: {
        kind: 'Collection',
        collectionKind: 'array',
        elementType: { kind: 'Primitive', primitive: 'string' },
      },
      default: {
        kind: 'ArrayLiteral',
        elements: [literal('us-west-2a'), literal('us-west-2b')],
      },
    },
  ],
  
  resources: [
    {
      kind: 'Component',
      id: 'Vpc',
      resourceType: { provider: 'aws', service: 'ec2', resource: 'vpc' },
      properties: {
        cidrBlock: literal('10.0.0.0/16'),
        
        // Create subnet for each AZ: [for az in availabilityZones : createSubnet(az)]
        subnets: {
          kind: 'For',
          valueVariable: 'az',
          collection: { kind: 'Variable', name: 'availabilityZones' },
          body: {
            kind: 'ObjectLiteral',
            properties: {
              availabilityZone: { kind: 'Variable', name: 'az' },
              cidrBlock: functionCall('cidrsubnet', literal('10.0.0.0/16'), literal(8), literal(0)),
            },
          },
          resultType: 'array',
        },
      },
    },
  ],
  
  outputs: [],
  rootScope: { id: 'program', kind: 'program', variables: new Map(), children: [] },
};
```

### Example 3: Invoke Data Source

```typescript
const manifest: SharedIirManifestV2 = {
  version: '2.0.0',
  metadata: { name: 'ami-lookup' },
  
  configuration: [],
  
  resources: [
    {
      kind: 'Resource',
      id: 'Instance',
      resourceType: { provider: 'aws', service: 'ec2', resource: 'instance' },
      properties: {
        instanceType: literal('t3.micro'),
        
        // Look up latest Ubuntu AMI
        ami: {
          kind: 'PropertyAccess',
          object: {
            kind: 'Invoke',
            token: 'aws:ec2/getAmi:getAmi',
            inputs: {
              mostRecent: literal(true),
              filters: {
                kind: 'ArrayLiteral',
                elements: [
                  {
                    kind: 'ObjectLiteral',
                    properties: {
                      name: literal('name'),
                      values: { kind: 'ArrayLiteral', elements: [literal('ubuntu/images/hvm-ssd/ubuntu-*-22.04-*')] },
                    },
                  },
                ],
              },
            },
          },
          property: 'id',
        },
      },
    },
  ],
  
  outputs: [],
  rootScope: { id: 'program', kind: 'program', variables: new Map(), children: [] },
};
```

---

## Comparison with Other IRs

| Feature | Shared IIR v2 | Pulumi PCL | Terraform JSON | CloudFormation |
|---------|---------------|------------|----------------|----------------|
| **Expression Types** | 15+ | 15+ (via HCL2) | Limited (refs only) | 10+ (intrinsics) |
| **Components** | ✅ First-class | ✅ First-class | ❌ No | ❌ No (nested stacks only) |
| **Type System** | ✅ Explicit | ✅ Explicit | ❌ Implicit | ❌ Implicit |
| **Scoping** | ✅ Lexical | ✅ Lexical | ❌ Flat | ❌ Flat |
| **Built-in Functions** | 50+ | 40+ | 100+ | 30+ |
| **Format** | In-memory | Text (HCL) | JSON | JSON |
| **Backend Neutral** | ✅ Yes | ⚠️ Language-specific | ❌ Terraform only | ❌ AWS only |

---

## Future Extensions

### 1. Policy Validation

Add policy expressions to resources:

```typescript
interface IirResource {
  // ...
  policies?: PolicyRule[];
}

interface PolicyRule {
  id: string;
  condition: Expression;
  effect: 'allow' | 'deny';
  message: string;
}
```

### 2. Cost Estimation

Attach cost metadata:

```typescript
interface ResourceMetadata {
  // ...
  estimatedCost?: {
    monthly: number;
    currency: string;
  };
}
```

### 3. Dependency Inversion

Support abstract resource types:

```typescript
interface AbstractResourceType {
  kind: 'abstract';
  interface: string;  // e.g., "storage/bucket"
  implementations: {
    aws: { provider: 'aws', service: 's3', resource: 'bucket' },
    azure: { provider: 'azure', service: 'storage', resource: 'account' },
  };
}
```

---

## Tooling

### Validation

```bash
iir validate manifest.json
```

Checks:
- Type correctness
- Reference validity
- Scope resolution
- Circular dependencies

### Visualization

```bash
iir graph manifest.json -o graph.dot
```

Generate dependency graphs.

### Optimization

```bash
iir optimize manifest.json --phases=dead-code,constant-fold
```

Apply optimization passes.

---

## References

- [Pulumi PCL README](https://github.com/pulumi/pulumi/blob/master/pkg/codegen/pcl/README.md)
- [HCL2 Specification](https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md)
- [Roslyn Compiler Architecture](https://github.com/dotnet/roslyn/wiki/Roslyn-Overview)
- [LLVM IR Reference](https://llvm.org/docs/LangRef.html)
- [AWS CDK RFC-006](https://github.com/cdktn-io/terraform-provider-cfncompat/pull/8)
- [Shared IIR RFC-06](https://github.com/open-constructs/cdktn-planning/pull/2)
