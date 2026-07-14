import type { Expression } from "../iir/shared/expression.ts";

export type TargetFormat = 'CFN' | 'TF' | 'ARM' | 'MOCK';

/**
 * Resolves semantic expressions into backend-specific representations.
 */
export function resolveExpression(expr: Expression, target: TargetFormat, isNestedArmExpr = false): unknown {
  switch (expr.kind) {
    case 'Literal':
      if (target === 'ARM' && isNestedArmExpr) {
        return typeof expr.literalValue === 'string' ? `'${expr.literalValue}'` : expr.literalValue;
      }
      return expr.literalValue;

    case 'Reference': {
      const r = expr.reference!;
      if (target === 'CFN') return { "Fn::GetAtt": [r.targetResourceId, r.attributePath.join('.')] };
      if (target === 'TF') return `\${${r.targetResourceId}.${r.attributePath.join('_')}}`;
      if (target === 'ARM') {
        const refStr = `reference(resourceId('Microsoft.Storage/storageAccounts', '${r.targetResourceId}'), '2023-05-01').${r.attributePath.join('.')}`;
        return isNestedArmExpr ? refStr : `[${refStr}]`;
      }
      if (target === 'MOCK') return `ref:${r.targetResourceId}.${r.attributePath.join('.')}`;
      break;
    }

    case 'Concat':
      if (target === 'CFN') return { "Fn::Join": ["", (expr.parts ?? []).map(p => resolveExpression(p, target))] };
      if (target === 'TF') return (expr.parts ?? []).map(p => p.kind === 'Literal' ? p.literalValue : resolveExpression(p, target)).join('');
      if (target === 'ARM') {
        const partsStr = (expr.parts ?? []).map(p => resolveExpression(p, target, true)).join(', ');
        const concatStr = `concat(${partsStr})`;
        return isNestedArmExpr ? concatStr : `[${concatStr}]`;
      }
      if (target === 'MOCK') return { concat: (expr.parts ?? []).map(p => resolveExpression(p, target)) };
      break;

    case 'Conditional':
      if (target === 'CFN') return { "Fn::If": [expr.conditionId!, resolveExpression(expr.whenTrue!, target), resolveExpression(expr.whenFalse!, target)] };
      if (target === 'TF') return `\${var.${expr.conditionId} ? ${resolveExpression(expr.whenTrue!, target)} : ${resolveExpression(expr.whenFalse!, target)}}`;
      if (target === 'ARM') {
        const condStr = `if(variables('${expr.conditionId}'), ${resolveExpression(expr.whenTrue!, target, true)}, ${resolveExpression(expr.whenFalse!, target, true)})`;
        return isNestedArmExpr ? condStr : `[${condStr}]`;
      }
      if (target === 'MOCK') return { conditional: { test: expr.conditionId, whenTrue: resolveExpression(expr.whenTrue!, target), whenFalse: resolveExpression(expr.whenFalse!, target) } };
      break;

    case 'Binary':
      if (target === 'MOCK') return { binary: { operator: expr.operator, left: resolveExpression(expr.left!, target), right: resolveExpression(expr.right!, target) } };
      if (target === 'CFN') {
        if (expr.operator === 'EQUAL') return { "Fn::Equals": [resolveExpression(expr.left!, target), resolveExpression(expr.right!, target)] };
        return { binary: expr.operator, left: resolveExpression(expr.left!, target), right: resolveExpression(expr.right!, target) };
      }
      if (target === 'TF') return `\${${resolveExpression(expr.left!, target)} ${operatorToTf(expr.operator!)} ${resolveExpression(expr.right!, target)}}`;
      if (target === 'ARM') return `[${resolveExpression(expr.left!, target, true)} ${operatorToTf(expr.operator!)} ${resolveExpression(expr.right!, target, true)}]`;
      break;

    case 'FunctionCall':
      if (target === 'MOCK') return { function: `${expr.functionRef!.namespace}.${expr.functionRef!.name}`, args: (expr.arguments ?? []).map(a => resolveExpression(a, target)) };
      if (target === 'CFN') return resolveFunctionCfn(expr);
      if (target === 'TF') return resolveFunctionTf(expr);
      if (target === 'ARM') return resolveFunctionArm(expr, isNestedArmExpr);
      break;

    case 'List':
      return (expr.elements ?? []).map(e => resolveExpression(e, target, isNestedArmExpr));

    case 'Map': {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(expr.fields ?? {})) {
        obj[k] = resolveExpression(v, target, isNestedArmExpr);
      }
      return obj;
    }

    case 'Object': {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(expr.objectFields ?? {})) {
        obj[k] = resolveExpression(v, target, isNestedArmExpr);
      }
      return obj;
    }
  }
  return undefined;
}

function operatorToTf(op: string): string {
  const map: Record<string, string> = {
    ADD: '+', SUBTRACT: '-', EQUAL: '==', NOT_EQUAL: '!=',
    LESS_THAN: '<', GREATER_THAN: '>', AND: '&&', OR: '||',
  };
  return map[op] ?? op;
}

function resolveFunctionCfn(expr: Expression): unknown {
  const fn = expr.functionRef!;
  const args = (expr.arguments ?? []).map(a => resolveExpression(a, 'CFN'));
  const fullName = `${fn.namespace}.${fn.name}`;
  if (fullName === 'core.join') return { "Fn::Join": [args[0], args[1]] };
  if (fullName === 'core.concat') return { "Fn::Join": ["", args] };
  if (fullName === 'core.select') return { "Fn::Select": args };
  if (fullName === 'string.lower') return args[0]; // CFN has no lower function
  return { [`Fn::${fn.name}`]: args };
}

function resolveFunctionTf(expr: Expression): string {
  const fn = expr.functionRef!;
  const args = (expr.arguments ?? []).map(a => resolveExpression(a, 'TF'));
  return `\${${fn.name}(${args.join(', ')})}`;
}

function resolveFunctionArm(expr: Expression, isNested: boolean): unknown {
  const fn = expr.functionRef!;
  const args = (expr.arguments ?? []).map(a => resolveExpression(a, 'ARM', true));
  const fnStr = `${fn.name}(${args.join(', ')})`;
  return isNested ? fnStr : `[${fnStr}]`;
}
