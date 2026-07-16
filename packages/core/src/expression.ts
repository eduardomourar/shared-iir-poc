/**
 * Expression types for property values and intrinsic functions
 */

export type Expression =
  | LiteralExpression
  | ReferenceExpression
  | FunctionCallExpression;

export interface LiteralExpression {
  readonly kind: 'Literal';
  readonly literalValue: any;
}

export interface Reference {
  readonly targetResourceId: string;
  readonly attributePath: string[];
  readonly expectedType: string;
}

export interface ReferenceExpression {
  readonly kind: 'Reference';
  readonly reference: Reference;
}

export interface FunctionCallExpression {
  readonly kind: 'FunctionCall';
  readonly functionName: string;
  readonly arguments: Expression[];
}
