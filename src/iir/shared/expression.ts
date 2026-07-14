export interface Reference {
  readonly targetResourceId: string;
  readonly attributePath: string[];
  readonly expectedType: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

export interface Condition {
  readonly id: string;
  readonly expression: Expression;
}

export const BinaryOperator = {
  ADD: 'ADD',
  SUBTRACT: 'SUBTRACT',
  EQUAL: 'EQUAL',
  NOT_EQUAL: 'NOT_EQUAL',
  LESS_THAN: 'LESS_THAN',
  GREATER_THAN: 'GREATER_THAN',
  AND: 'AND',
  OR: 'OR',
} as const;

export type BinaryOperator = typeof BinaryOperator[keyof typeof BinaryOperator];

export interface SemanticFunction {
  readonly namespace: string;
  readonly name: string;
}

/**
 * JSII-friendly expression model:
 * - Single interface with a `kind` discriminant.
 * - Optional properties for each expression variant.
 */
export interface Expression {
  readonly kind: 'Literal' | 'Reference' | 'Concat' | 'Conditional' | 'List' | 'Map' | 'Binary' | 'FunctionCall' | 'Object';

  // Literal
  readonly literalValue?: string | number | boolean;

  // Reference
  readonly reference?: Reference;

  // Concat
  readonly parts?: Expression[];

  // Conditional
  readonly conditionId?: string;
  readonly whenTrue?: Expression;
  readonly whenFalse?: Expression;

  // List
  readonly elements?: Expression[];

  // Map
  readonly fields?: Record<string, Expression>;

  // Binary
  readonly operator?: string;
  readonly left?: Expression;
  readonly right?: Expression;

  // FunctionCall
  readonly functionRef?: SemanticFunction;
  readonly arguments?: Expression[];

  // Object
  readonly objectFields?: Record<string, Expression>;
}

/**
 * AST visitor pattern for expressions.
 * Serializers implement this instead of switch statements.
 */
export interface IExpressionVisitor {
  visitLiteral(expr: Expression): unknown;
  visitReference(expr: Expression): unknown;
  visitConcat(expr: Expression): unknown;
  visitConditional(expr: Expression): unknown;
  visitList(expr: Expression): unknown;
  visitMap(expr: Expression): unknown;
  visitBinary(expr: Expression): unknown;
  visitFunctionCall(expr: Expression): unknown;
  visitObject(expr: Expression): unknown;
}

/**
 * Dispatch an expression to the appropriate visitor method.
 */
export function visitExpression(expr: Expression, visitor: IExpressionVisitor): unknown {
  switch (expr.kind) {
    case 'Literal': return visitor.visitLiteral(expr);
    case 'Reference': return visitor.visitReference(expr);
    case 'Concat': return visitor.visitConcat(expr);
    case 'Conditional': return visitor.visitConditional(expr);
    case 'List': return visitor.visitList(expr);
    case 'Map': return visitor.visitMap(expr);
    case 'Binary': return visitor.visitBinary(expr);
    case 'FunctionCall': return visitor.visitFunctionCall(expr);
    case 'Object': return visitor.visitObject(expr);
  }
}
