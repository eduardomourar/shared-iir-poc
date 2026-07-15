import type { Expression, FunctionCallExpression } from "../expression";

/**
 * Expression resolver - converts IR expressions to backend-specific formats
 */

export interface IIExpressionResolver {
  resolve(expr: Expression): any;
}

/**
 * CloudFormation expression resolver
 */
export class CloudFormationExpressionResolver implements IIExpressionResolver {
  resolve(expr: Expression): any {
    switch (expr.kind) {
      case 'Literal':
        return expr.literalValue;

      case 'Reference':
        if (expr.reference.attributePath.length === 0) {
          return { Ref: expr.reference.targetResourceId };
        }
        return {
          'Fn::GetAtt': [
            expr.reference.targetResourceId,
            expr.reference.attributePath.join('.')
          ]
        };

      case 'FunctionCall':
        return this.resolveFunctionCall(expr);

      default:
        throw new Error(`Unknown expression kind: ${(expr as any).kind}`);
    }
  }

  private resolveFunctionCall(expr: FunctionCallExpression): any {
    const args = expr.arguments.map(a => this.resolve(a));

    // CloudFormation intrinsic functions - keep as objects
    return { [expr.functionName]: args };
  }
}

/**
 * Terraform expression resolver
 */
export class TerraformExpressionResolver implements IIExpressionResolver {
  resolve(expr: Expression): any {
    switch (expr.kind) {
      case 'Literal':
        return expr.literalValue;

      case 'Reference':
        if (expr.reference.attributePath.length === 0) {
          return `\${${expr.reference.targetResourceId}}`;
        }
        return `\${${expr.reference.targetResourceId}.${expr.reference.attributePath.join('.')}}`;

      case 'FunctionCall':
        return this.resolveFunctionCall(expr);

      default:
        throw new Error(`Unknown expression kind: ${(expr as any).kind}`);
    }
  }

  private resolveFunctionCall(expr: FunctionCallExpression): string {
    const args = expr.arguments.map(a => this.resolve(a));
    return `${expr.functionName}(${args.join(', ')})`;
  }
}

/**
 * ARM expression resolver
 */
export class ArmExpressionResolver implements IIExpressionResolver {
  resolve(expr: Expression): any {
    switch (expr.kind) {
      case 'Literal':
        return expr.literalValue;

      case 'Reference':
        if (expr.reference.attributePath.length === 0) {
          return `[resourceId('${expr.reference.targetResourceId}')]`;
        }
        return `[reference('${expr.reference.targetResourceId}').${expr.reference.attributePath.join('.')}]`;

      case 'FunctionCall':
        return this.resolveFunctionCall(expr);

      default:
        throw new Error(`Unknown expression kind: ${(expr as any).kind}`);
    }
  }

  private resolveFunctionCall(expr: FunctionCallExpression): string {
    const args = expr.arguments.map(a => this.resolve(a));
    return `[${expr.functionName}(${args.join(', ')})]`;
  }
}
