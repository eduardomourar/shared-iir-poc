# Migration Guide: Shared IIR v1 → v2

## Overview

Shared IIR v2 represents a significant evolution toward a truly platform-agnostic intermediate representation. This guide helps you migrate from v1 to v2.

**Key changes:**
- Enhanced expression system (3 types → 15+ types)
- Comprehensive resource options
- First-class component support
- Explicit scoping and variables
- Built-in function registry
- Type system foundation

---

## Quick Reference: What Changed

| Concept | v1 | v2 |
|---------|----|----|
| **Expressions** | 3 types | 15+ types (binary ops, property access, conditionals, etc.) |
| **Resource Options** | Only `conditionId` | Full options (protect, ignoreChanges, provider, parent, etc.) |
| **Components** | ❌ Not supported | ✅ First-class `IirComponent` type |
| **Variables** | ❌ No scoping | ✅ Scope hierarchy with configuration, locals, loop vars |
| **Type System** | String-based (`expectedType: string`) | Structured types (`Type` union) |
| **Built-in Functions** | Backend-specific | Cross-platform registry |
| **Manifest** | Simple `{ resources, outputs }` | Rich metadata, configuration, scoping |

---

## Migration Strategies

### Strategy 1: Side-by-Side (Recommended)

Keep both v1 and v2 implementations during transition:

```typescript
// v1 (existing code)
import { Expression, IirResource, SharedIirManifest } from "@shared-iir/core";

// v2 (new code)
import {
  Expression as ExpressionV2,
  IirResource as IirResourceV2,
  SharedIirManifestV2
} from "@shared-iir/core/v2";
```

**Pros:**
- No breaking changes to existing code
- Gradual migration
- Test both versions in parallel

**Cons:**
- Temporary duplication
- Need to maintain both APIs

### Strategy 2: Adapter Pattern

Create adapters to convert between v1 and v2:

```typescript
import { convertManifestV1ToV2, convertManifestV2ToV1 } from "@shared-iir/core/adapters";

// Use v1 extractor, convert to v2
const v1Manifest = extractorV1.extract(app);
const v2Manifest = convertManifestV1ToV2(v1Manifest);

// Use v2 lowering pipeline, convert back for v1 serializer
const lowered = pipelineV2.run(v2Manifest, context);
const v1Lowered = convertManifestV2ToV1(lowered);
```

**Pros:**
- Interoperability between versions
- Incremental adoption (migrate one component at a time)

**Cons:**
- Conversion overhead
- Some v2 features can't map to v1 (degraded gracefully)

### Strategy 3: Direct Migration

Migrate entire codebase to v2 in one step:

**Pros:**
- Clean break, no legacy code
- Full access to v2 features immediately

**Cons:**
- High-risk, large change
- All extractors, lowering phases, serializers must be updated

**Recommendation:** Use **Strategy 1** (side-by-side) for production systems. Use **Strategy 3** (direct) for new projects or PoCs.

---

## Step-by-Step Migration

### 1. Expressions

#### v1 Expression Types
```typescript
type Expression =
  | LiteralExpression
  | ReferenceExpression
  | FunctionCallExpression;
```

#### v2 Expression Types
```typescript
type Expression =
  // v1 types (backward compatible)
  | LiteralExpression
  | ReferenceExpression
  | FunctionCallExpression
  
  // NEW: Literals
  | ObjectLiteralExpression
  | ArrayLiteralExpression
  | TemplateStringExpression
  
  // NEW: Access
  | PropertyAccessExpression
  | IndexAccessExpression
  | VariableExpression
  
  // NEW: Operations
  | BinaryOperationExpression
  | UnaryOperationExpression
  | ConditionalExpression
  
  // NEW: Advanced
  | InvokeExpression
  | CallExpression
  | ForExpression;
```

**Migration:**
- v1 expressions are valid v2 expressions (no changes needed)
- Use new expression types for richer semantics

**Example: CloudFormation Fn::If → Conditional**

v1 (CloudFormation intrinsic):
```typescript
const expr: FunctionCallExpression = {
  kind: 'FunctionCall',
  functionName: 'Fn::If',
  arguments: [
    { kind: 'Reference', reference: { targetResourceId: 'Condition', attributePath: [] } },
    { kind: 'Literal', literalValue: 'value-if-true' },
    { kind: 'Literal', literalValue: 'value-if-false' },
  ],
};
```

v2 (native conditional):
```typescript
const expr: ConditionalExpression = {
  kind: 'Conditional',
  condition: { kind: 'Variable', name: 'Condition' },
  trueValue: { kind: 'Literal', literalValue: 'value-if-true' },
  falseValue: { kind: 'Literal', literalValue: 'value-if-false' },
};
```

### 2. Resources

#### v1 Resource
```typescript
interface IirResource {
  id: string;
  resourceType: ResourceType;
  properties: Record<string, Expression>;
  dependencies: Dependency[];
  conditionId?: string;  // Only option!
}
```

#### v2 Resource
```typescript
interface IirResource {
  kind: 'Resource';  // NEW: Discriminator
  id: string;
  resourceType: ResourceType;
  properties: Record<string, Expression>;
  options?: ResourceOptions;  // NEW: Full options
}

interface ResourceOptions {
  dependsOn?: string[];
  provider?: string;
  parent?: string;
  protect?: boolean;
  ignoreChanges?: string[];
  deleteBeforeReplace?: boolean;
  retainOnDelete?: boolean;
  customTimeouts?: CustomTimeouts;
  condition?: string;  // v1's conditionId moved here
  // ... and more
}
```

**Migration:**

```typescript
// v1
const v1Resource: IirResource = {
  id: 'MyBucket',
  resourceType: { provider: 'aws', service: 's3', resource: 'bucket' },
  properties: { /* ... */ },
  dependencies: [{ sourceId: 'MyBucket', targetId: 'MyKey', kind: 'implicit' }],
  conditionId: 'CreateBucket',
};

// v2
const v2Resource: IirResourceV2 = {
  kind: 'Resource',
  id: 'MyBucket',
  resourceType: { provider: 'aws', service: 's3', resource: 'bucket' },
  properties: { /* ... */ },
  options: {
    dependsOn: ['MyKey'],  // v1 dependencies moved here
    condition: 'CreateBucket',  // v1 conditionId moved here
    protect: true,  // NEW: Additional options
    ignoreChanges: ['tags'],
  },
};
```

### 3. Manifest

#### v1 Manifest
```typescript
interface SharedIirManifest {
  resources: IirResource[];
  outputs: Output[];
}
```

#### v2 Manifest
```typescript
interface SharedIirManifestV2 {
  version: string;  // NEW
  metadata: ProgramMetadata;  // NEW
  configuration: ConfigurationVariable[];  // NEW
  resources: IirResourceOrComponent[];  // Enhanced
  outputs: OutputValue[];  // Enhanced
  rootScope: Scope;  // NEW
  providers?: ProviderReference[];  // NEW
  options?: ProgramOptions;  // NEW
}
```

**Migration:**

```typescript
// v1
const v1Manifest: SharedIirManifest = {
  resources: [/* ... */],
  outputs: [{ name: 'BucketArn', value: bucketArnExpr }],
};

// v2
const v2Manifest: SharedIirManifestV2 = {
  version: '2.0.0',
  metadata: {
    name: 'my-stack',
    sourceFramework: 'aws-cdk',
  },
  configuration: [],  // Add config variables if needed
  resources: [/* ... */],
  outputs: [
    {
      name: 'BucketArn',
      value: bucketArnExpr,
      description: 'ARN of the created bucket',  // NEW: Optional description
      sensitive: false,
    },
  ],
  rootScope: {
    id: 'program',
    kind: 'program',
    variables: new Map(),
    children: [],
  },
};
```

### 4. Extractors

#### v1 Extractor
```typescript
class AwsCdkExtractor implements IIirExtractor {
  extract(app: IConstruct): SharedIirManifest {
    const resources: IirResource[] = /* extract resources */;
    return { resources, outputs: [] };
  }
}
```

#### v2 Extractor
```typescript
class AwsCdkExtractorV2 implements IIirExtractorV2 {
  extract(app: IConstruct): SharedIirManifestV2 {
    const scopeManager = new ScopeManager();
    scopeManager.createRootScope();
    
    // Extract configuration from context
    const configuration = this.extractConfiguration(app);
    
    // Extract resources with enhanced options
    const resources = this.extractResources(app, scopeManager);
    
    // Extract outputs with metadata
    const outputs = this.extractOutputs(app);
    
    return {
      version: '2.0.0',
      metadata: {
        name: app.node.id,
        sourceFramework: 'aws-cdk',
        sourceFrameworkVersion: require('aws-cdk-lib/package.json').version,
      },
      configuration,
      resources,
      outputs,
      rootScope: scopeManager.getCurrentScope()!,
    };
  }
  
  private extractResources(app: IConstruct, scopeManager: ScopeManager): IirResourceOrComponent[] {
    const resources: IirResourceOrComponent[] = [];
    
    for (const construct of app.node.findAll()) {
      if (CfnResource.isCfnResource(construct)) {
        const resource = this.extractCfnResource(construct);
        if (resource) {
          resources.push(resource);
        }
      }
    }
    
    return resources;
  }
  
  private extractCfnResource(cfn: CfnResource): IirResourceV2 {
    return {
      kind: 'Resource',
      id: cfn.node.path,
      resourceType: this.mapCfnTypeToSemantic(cfn.cfnResourceType),
      properties: this.extractProperties(cfn),
      options: this.extractResourceOptions(cfn),  // NEW
    };
  }
  
  private extractResourceOptions(cfn: CfnResource): ResourceOptions {
    return {
      condition: (cfn as any).cfnOptions?.condition,
      dependsOn: cfn.node.dependencies.map(d => d.node.path),
      // Extract more options as needed
    };
  }
}
```

### 5. Serializers

#### v1 Serializer
```typescript
class CloudFormationSerializer implements IBackendSerializer {
  serialize(context: SerializationContext): AssemblyArtifact {
    const template: any = { Resources: {} };
    
    for (const resource of context.manifest.resources) {
      template.Resources[resource.id] = {
        Type: this.mapResourceType(resource.resourceType),
        Properties: this.serializeProperties(resource.properties),
        Condition: resource.conditionId,  // v1 way
      };
    }
    
    return { /* ... */ };
  }
}
```

#### v2 Serializer
```typescript
class CloudFormationSerializerV2 implements IBackendSerializerV2 {
  serialize(context: SerializationContextV2): AssemblyArtifact {
    const template: any = { Resources: {}, Conditions: {} };
    
    for (const resource of context.manifest.resources) {
      if (resource.kind !== 'Resource') continue;  // Skip components
      
      const cfnResource: any = {
        Type: this.mapResourceType(resource.resourceType),
        Properties: this.serializeProperties(resource.properties, context),
      };
      
      // Serialize options
      if (resource.options) {
        if (resource.options.condition) {
          cfnResource.Condition = resource.options.condition;
        }
        if (resource.options.dependsOn) {
          cfnResource.DependsOn = resource.options.dependsOn;
        }
        if (resource.options.retainOnDelete) {
          cfnResource.DeletionPolicy = 'Retain';
        }
        // ... handle other options
      }
      
      template.Resources[resource.id] = cfnResource;
    }
    
    return { /* ... */ };
  }
  
  private serializeProperties(
    properties: Record<string, Expression>,
    context: SerializationContextV2
  ): any {
    const result: any = {};
    
    for (const [key, expr] of Object.entries(properties)) {
      result[key] = this.serializeExpression(expr, context);
    }
    
    return result;
  }
  
  private serializeExpression(expr: Expression, context: SerializationContextV2): any {
    switch (expr.kind) {
      case 'Literal':
        return expr.literalValue;
      
      case 'Reference':
        return { 'Fn::GetAtt': [expr.reference.targetResourceId, ...expr.reference.attributePath] };
      
      case 'PropertyAccess':  // NEW: Handle v2 expressions
        const obj = this.serializeExpression(expr.object, context);
        return { 'Fn::GetAtt': [obj, expr.property] };
      
      case 'Conditional':  // NEW: Native conditional → Fn::If
        return {
          'Fn::If': [
            this.serializeExpression(expr.condition, context),
            this.serializeExpression(expr.trueValue, context),
            this.serializeExpression(expr.falseValue, context),
          ],
        };
      
      case 'BinaryOperation':  // NEW: Ops → intrinsics
        if (expr.operator === '==') {
          return { 'Fn::Equals': [
            this.serializeExpression(expr.left, context),
            this.serializeExpression(expr.right, context),
          ]};
        }
        // ... handle other operators
        
      // ... handle other v2 expression types
      
      default:
        throw new Error(`Unsupported expression kind: ${(expr as any).kind}`);
    }
  }
}
```

---

## Backward Compatibility

### Supported: v1 → v2

All v1 manifests can be automatically converted to v2:

```typescript
import { convertV1ToV2 } from "@shared-iir/core/migration";

const v1Manifest: SharedIirManifest = /* ... */;
const v2Manifest: SharedIirManifestV2 = convertV1ToV2(v1Manifest);
```

**Conversion rules:**
- `IirResource` → `IirResourceV2` with `kind: 'Resource'`
- `conditionId` → `options.condition`
- `dependencies` → `options.dependsOn`
- Empty `configuration` and `rootScope` created
- Minimal `metadata` generated

### Partial: v2 → v1

v2 manifests can be downgraded to v1 with feature loss:

```typescript
import { convertV2ToV1 } from "@shared-iir/core/migration";

const v2Manifest: SharedIirManifestV2 = /* ... */;
const v1Manifest: SharedIirManifest = convertV2ToV1(v2Manifest);
```

**Feature loss:**
- Components are dropped (can't represent in v1)
- Resource options beyond `condition` are dropped
- Configuration variables are dropped
- Scoping information is dropped
- v2-only expressions are converted to `FunctionCallExpression` or error

**Warning:** Only use v2 → v1 conversion for compatibility with old serializers. Prefer migrating serializers to v2.

---

## Testing Strategy

### Parallel Testing

Run both v1 and v2 extractors/serializers and compare outputs:

```typescript
describe('Migration compatibility', () => {
  it('should produce equivalent CloudFormation from v1 and v2', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    new s3.Bucket(stack, 'Bucket', { versioned: true });
    
    // Extract with both versions
    const v1Manifest = new AwsCdkExtractor().extract(app);
    const v2Manifest = new AwsCdkExtractorV2().extract(app);
    
    // Serialize with both versions
    const v1Output = new CloudFormationSerializer().serialize({ manifest: v1Manifest });
    const v2Output = new CloudFormationSerializerV2().serialize({ manifest: v2Manifest });
    
    // Compare (should be functionally equivalent)
    expect(normalizeTemplate(v1Output.template)).toEqual(normalizeTemplate(v2Output.template));
  });
});
```

### Feature Testing

Test v2-specific features that have no v1 equivalent:

```typescript
describe('v2 features', () => {
  it('should handle component resources', () => {
    const manifest: SharedIirManifestV2 = {
      /* ... */
      resources: [
        {
          kind: 'Component',
          id: 'MyVpc',
          resourceType: { provider: 'aws', service: 'ec2', resource: 'vpc' },
          properties: { cidr: literal('10.0.0.0/16') },
          implementation: {
            type: 'inline',
            resources: [/* subnets, gateways, etc. */],
          },
        },
      ],
    };
    
    const serializer = new CloudFormationSerializerV2();
    const output = serializer.serialize({ manifest });
    
    // Component should expand to multiple CFN resources
    expect(Object.keys(output.template.Resources).length).toBeGreaterThan(1);
  });
  
  it('should handle binary operations', () => {
    const expr: BinaryOperationExpression = {
      kind: 'BinaryOperation',
      operator: '==',
      left: { kind: 'Variable', name: 'Environment' },
      right: { kind: 'Literal', literalValue: 'production' },
    };
    
    const serializer = new CloudFormationSerializerV2();
    const result = serializer.serializeExpression(expr);
    
    expect(result).toEqual({
      'Fn::Equals': ['${Environment}', 'production'],
    });
  });
});
```

---

## Timeline Recommendation

### Phase 1: Foundation (Weeks 1-2)
- ✅ Implement v2 types (expression-v2.ts, resource-v2.ts, etc.)
- ✅ Create migration adapters (v1 ↔ v2 conversion)
- ✅ Set up side-by-side package structure

### Phase 2: Extractors (Weeks 3-4)
- Migrate AWS CDK extractor to v2
- Add component extraction
- Add configuration extraction
- Test v1 vs v2 output equivalence

### Phase 3: Serializers (Weeks 5-6)
- Migrate CloudFormation serializer to v2
- Migrate Terraform serializer to v2
- Handle v2 expressions in all serializers
- Test output equivalence

### Phase 4: Lowering (Weeks 7-8)
- Migrate lowering phases to v2
- Add new phases for v2 features (component expansion, type checking)
- Update pipeline

### Phase 5: Cleanup (Weeks 9-10)
- Deprecate v1 APIs
- Update documentation
- Create migration tools
- Final testing

### Phase 6: v1 Removal (Future)
- Remove v1 code after grace period
- v2 becomes the only version

---

## Common Pitfalls

### 1. Forgetting to set `kind` discriminator
```typescript
// ❌ Wrong (v1 style in v2 manifest)
const resource = {
  id: 'MyResource',
  resourceType: /* ... */,
  properties: /* ... */,
};

// ✅ Correct (v2 requires kind)
const resource: IirResource = {
  kind: 'Resource',  // Don't forget!
  id: 'MyResource',
  resourceType: /* ... */,
  properties: /* ... */,
};
```

### 2. Not handling new expression types in serializers
```typescript
// ❌ Wrong (only handles v1 expressions)
serializeExpression(expr: Expression): any {
  if (expr.kind === 'Literal') return expr.literalValue;
  if (expr.kind === 'Reference') return /* ... */;
  throw new Error('Unsupported');  // Fails on PropertyAccess, Conditional, etc.
}

// ✅ Correct (handles all v2 expressions)
serializeExpression(expr: Expression): any {
  switch (expr.kind) {
    case 'Literal': return expr.literalValue;
    case 'Reference': return /* ... */;
    case 'PropertyAccess': return /* ... */;
    case 'Conditional': return /* ... */;
    // ... handle all cases
    default:
      const exhaustive: never = expr;  // TypeScript ensures all cases handled
      throw new Error(`Unhandled expression: ${(expr as any).kind}`);
  }
}
```

### 3. Assuming v1 dependencies still exist
```typescript
// ❌ Wrong (v1 had top-level dependencies array)
for (const dep of manifest.dependencies) {  // v2 manifests don't have this
  // ...
}

// ✅ Correct (v2 dependencies are in resource.options)
for (const resource of manifest.resources) {
  const deps = resource.options?.dependsOn || [];
  // ...
}
```

---

## Getting Help

- **Documentation:** [docs/architecture.md](./architecture.md), [docs/pcl-comparison.md](./pcl-comparison.md)
- **Examples:** See `__tests__/migration.test.ts`
- **Issues:** Report migration problems at [repo issues]

## Next Steps

After migration:
1. Review [PCL Comparison](./pcl-comparison.md) for advanced v2 features
2. Explore built-in functions in [builtin-functions.ts](../packages/core/src/builtin-functions.ts)
3. Implement custom lowering phases using new expression types
4. Consider adding type checking to your pipeline
