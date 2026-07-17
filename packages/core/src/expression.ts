/**
 * Enhanced expression system for Shared IIR v2
 *
 * Inspired by Pulumi PCL and HCL2, this provides a rich expression model
 * that can represent complex computations across different platforms.
 */

/**
 * All expression types in the enhanced model
 * Note: Cannot use discriminated unions with 'extends BaseExpression' due to JSII constraints
 */
export type Expression =
  // Literals and primitives
  | LiteralExpression
  | ObjectLiteralExpression
  | ArrayLiteralExpression
  | TemplateStringExpression

  // References and access
  | ReferenceExpression
  | PropertyAccessExpression
  | IndexAccessExpression

  // Operations
  | BinaryOperationExpression
  | UnaryOperationExpression
  | ConditionalExpression

  // Functions and invocations
  | FunctionCallExpression
  | InvokeExpression
  | CallExpression

  // Advanced
  | ForExpression
  | VariableExpression;

// ============================================================================
// Literals
// ============================================================================

/**
 * Literal value (string, number, boolean, null)
 */
export interface LiteralExpression {
  readonly kind: 'Literal';
  readonly literalValue: any;  // JSII doesn't support union types here
}

/**
 * Object literal with computed properties
 * Example: { key1 = expr1, key2 = expr2 }
 */
export interface ObjectLiteralExpression {
  readonly kind: 'ObjectLiteral';
  readonly properties: Record<string, Expression>;
}

/**
 * Array literal with computed elements
 * Example: [expr1, expr2, expr3]
 */
export interface ArrayLiteralExpression { 
  readonly kind: 'ArrayLiteral';
  readonly elements: Expression[];
}

/**
 * Template string with interpolations
 * Example: "Hello ${name}, you are ${age} years old"
 */
export interface TemplateStringExpression {
  readonly kind: 'TemplateString';
  readonly parts: any[];  // JSII doesn't support union array types
}

// ============================================================================
// References and Access
// ============================================================================

/**
 * Reference to a resource attribute
 * Example: bucket.arn, vpc.id
 */
export interface ReferenceExpression { 
  readonly kind: 'Reference';
  readonly reference: Reference;
}

export interface Reference {
  readonly targetResourceId: string;
  readonly attributePath: string[];
  readonly expectedType?: Type;  // Optional type hint
}

/**
 * Property access on an expression
 * Example: obj.property.nested
 */
export interface PropertyAccessExpression { 
  readonly kind: 'PropertyAccess';
  readonly object: Expression;
  readonly property: string;
}

/**
 * Index access on an expression
 * Example: list[0], map["key"], obj[expr]
 */
export interface IndexAccessExpression { 
  readonly kind: 'IndexAccess';
  readonly collection: Expression;
  readonly index: Expression;
}

/**
 * Variable reference
 * Example: local variable, configuration input, loop variable
 */
export interface VariableExpression { 
  readonly kind: 'Variable';
  readonly name: string;
  readonly scope?: string;  // Optional scope identifier
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Binary operation
 * Example: a + b, x && y, count > 0
 */
export interface BinaryOperationExpression { 
  readonly kind: 'BinaryOperation';
  readonly operator: BinaryOperator;
  readonly left: Expression;
  readonly right: Expression;
}

export const BinaryOperators = {
  // Arithmetic
  Add: '+',
  Subtract: '-',
  Multiply: '*',
  Divide: '/',
  Modulo: '%',

  // Comparison
  Equal: '==',
  NotEqual: '!=',
  LessThan: '<',
  LessThanOrEqual: '<=',
  GreaterThan: '>',
  GreaterThanOrEqual: '>=',

  // Logical
  And: '&&',
  Or: '||',

  // String
  Concat: '++',
} as const;

export type BinaryOperator = typeof BinaryOperators[keyof typeof BinaryOperators];

/**
 * Unary operation
 * Example: !condition, -number
 */
export interface UnaryOperationExpression { 
  readonly kind: 'UnaryOperation';
  readonly operator: UnaryOperator;
  readonly operand: Expression;
}

export const UnaryOperators = {
  Not: '!',
  Negate: '-',
} as const;

export type UnaryOperator = typeof UnaryOperators[keyof typeof UnaryOperators];

/**
 * Conditional (ternary) expression
 * Example: condition ? trueValue : falseValue
 */
export interface ConditionalExpression { 
  readonly kind: 'Conditional';
  readonly condition: Expression;
  readonly trueValue: Expression;
  readonly falseValue: Expression;
}

// ============================================================================
// Functions and Invocations
// ============================================================================

/**
 * Function call (built-in or user-defined)
 * Example: join(",", list), toJSON(obj)
 */
export interface FunctionCallExpression { 
  readonly kind: 'FunctionCall';
  readonly functionName: string;
  readonly arguments: Expression[];
}

/**
 * Provider function invocation (data source query)
 * Maps to Pulumi invoke, Terraform data sources
 * Example: invoke("aws:ec2/getAmi:getAmi", { filters = [...] })
 */
export interface InvokeExpression { 
  readonly kind: 'Invoke';
  readonly token: string;  // Fully qualified function token (e.g., "aws:ec2/getAmi:getAmi")
  readonly inputs: Record<string, Expression>;
  readonly options?: InvokeOptions;
}

export interface InvokeOptions {
  readonly provider?: string;  // Custom provider reference
  readonly parent?: string;    // Parent resource ID
}

/**
 * Resource method call
 * Maps to Pulumi call, AWS CDK method invocations
 * Example: call(cluster, "getKubeconfig", {})
 */
export interface CallExpression { 
  readonly kind: 'Call';
  readonly resourceId: string;
  readonly methodName: string;
  readonly arguments: Record<string, Expression>;
  readonly options?: CallOptions;
}

export interface CallOptions {
  readonly provider?: string;
}

// ============================================================================
// Advanced Expressions
// ============================================================================

/**
 * For expression (list/object comprehension)
 * Example: [for item in list : upper(item)]
 * Example: {for k, v in map : k => upper(v)}
 */
export interface ForExpression { 
  readonly kind: 'For';
  readonly keyVariable?: string;     // Optional key variable (for object iteration)
  readonly valueVariable: string;    // Value variable
  readonly collection: Expression;   // Collection to iterate over
  readonly condition?: Expression;   // Optional filter condition
  readonly body: Expression;         // Expression to evaluate for each item
  readonly resultType: 'array' | 'object';
}

// ============================================================================
// Type System
// ============================================================================

/**
 * Type representation for expressions
 */
export type Type =
  | PrimitiveType
  | CollectionType
  | ObjectType
  | UnionType
  | ResourceTypeRef
  | OutputType
  | AnyType;

export interface PrimitiveType {
  readonly kind: 'Primitive';
  readonly primitive: 'string' | 'number' | 'boolean' | 'null';
}

export interface CollectionType {
  readonly kind: 'Collection';
  readonly collectionKind: 'array' | 'map' | 'set';
  readonly elementType: Type;
}

export interface ObjectType {
  readonly kind: 'Object';
  readonly properties: Record<string, Type>;
  readonly additionalProperties?: Type;  // For indexable objects
}

export interface UnionType {
  readonly kind: 'Union';
  readonly types: Type[];
}

export interface ResourceTypeRef {
  readonly kind: 'Resource';
  readonly token: string;  // Fully qualified resource type (e.g., "aws:s3/bucket:Bucket")
}

export interface OutputType {
  readonly kind: 'Output';
  readonly valueType: Type;  // Output<T> wraps another type
}

export interface AnyType {
  readonly kind: 'Any';
}

// ============================================================================
// Expression Utilities
// ============================================================================

/**
 * Expression visitor pattern for traversal and transformation
 * Note: Cannot use generics with JSII, so returns 'any'
 */
export interface IExpressionVisitor {
  visitLiteral(expr: LiteralExpression): any;
  visitObjectLiteral(expr: ObjectLiteralExpression): any;
  visitArrayLiteral(expr: ArrayLiteralExpression): any;
  visitTemplateString(expr: TemplateStringExpression): any;

  visitReference(expr: ReferenceExpression): any;
  visitPropertyAccess(expr: PropertyAccessExpression): any;
  visitIndexAccess(expr: IndexAccessExpression): any;
  visitVariable(expr: VariableExpression): any;

  visitBinaryOperation(expr: BinaryOperationExpression): any;
  visitUnaryOperation(expr: UnaryOperationExpression): any;
  visitConditional(expr: ConditionalExpression): any;

  visitFunctionCall(expr: FunctionCallExpression): any;
  visitInvoke(expr: InvokeExpression): any;
  visitCall(expr: CallExpression): any;

  visitFor(expr: ForExpression): any;
}

/**
 * Helper to create literal expressions
 */
export function literal(value: string | number | boolean | null): LiteralExpression {
  return { kind: 'Literal', literalValue: value };
}

/**
 * Helper to create reference expressions
 */
export function reference(
  resourceId: string,
  attributePath: string[] = [],
  expectedType?: Type
): ReferenceExpression {
  return {
    kind: 'Reference',
    reference: { targetResourceId: resourceId, attributePath, expectedType },
  };
}

/**
 * Helper to create function call expressions
 */
export function functionCall(name: string, ...args: Expression[]): FunctionCallExpression {
  return { kind: 'FunctionCall', functionName: name, arguments: args };
}

/**
 * Helper to create binary operation expressions
 */
export function binaryOp(
  operator: BinaryOperator,
  left: Expression,
  right: Expression
): BinaryOperationExpression {
  return { kind: 'BinaryOperation', operator, left, right };
}

/**
 * Helper to create conditional expressions
 */
export function conditional(
  condition: Expression,
  trueValue: Expression,
  falseValue: Expression
): ConditionalExpression {
  return { kind: 'Conditional', condition, trueValue, falseValue };
}
