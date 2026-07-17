import type { SharedIirManifest } from "../../manifest";
import type { ILoweringPhase } from "../phase";
import type { ILoweringContext } from "../context";
import type { Expression, FunctionCallExpression } from "../../expression";
import type { IirResourceOrComponent } from "../../resource";

/**
 * Function conversion phase - converts CloudFormation intrinsic functions
 * to target backend equivalents using terraform-provider-cfncompat.
 *
 * Based on: https://github.com/cdktn-io/terraform-provider-cfncompat
 *
 * CloudFormation intrinsics are converted to cfncompat provider functions:
 * - Fn::Join → provider::cfncompat::join
 * - Fn::Split → provider::cfncompat::split
 * - Fn::Select → provider::cfncompat::select
 * - Fn::Base64 → provider::cfncompat::base64
 * - Fn::Cidr → provider::cfncompat::cidr
 * - Fn::Sub → provider::cfncompat::sub
 * - Fn::If → provider::cfncompat::condition_if
 * - etc.
 *
 * Excluded intrinsics (resolved at synthesis time, not converted):
 * - Ref, Fn::GetAtt - Reference resolution (synthesis-time)
 * - Fn::GetAZs - AWS API access (use Terraform data source)
 * - Fn::ImportValue - CloudFormation cross-stack exports
 * - Fn::Transform - CloudFormation macros
 */
export class FunctionConversionPhase implements ILoweringPhase {
  readonly id = 'function-conversion';
  readonly displayName = 'Function Conversion (cfncompat)';

  run(model: SharedIirManifest, context: ILoweringContext): SharedIirManifest {
    return {
      ...model,
      resources: model.resources.map(resource => this.convertResource(resource, context)),
      outputs: model.outputs.map(output => ({
        ...output,
        value: this.convertExpression(output.value, context),
      })),
    };
  }

  private convertResource(resource: IirResourceOrComponent, context: ILoweringContext): IirResourceOrComponent {
    if (resource.kind !== 'Resource') {
      return resource;  // Skip components for now
    }
    const convertedProperties: Record<string, Expression> = {};

    for (const [key, value] of Object.entries(resource.properties)) {
      convertedProperties[key] = this.convertExpression(value, context);
    }

    return {
      ...resource,
      kind: 'Resource' as const,
      properties: convertedProperties,
    };
  }

  private convertExpression(expr: Expression, context: ILoweringContext): Expression {
    if (expr.kind === 'FunctionCall') {
      return this.convertFunctionCall(expr, context);
    }

    return expr;
  }

  private convertFunctionCall(expr: FunctionCallExpression, context: ILoweringContext): Expression {
    const targetPlatform = context.targetPlatform;

    // Convert CloudFormation functions to target backend
    if (targetPlatform === 'terraform' || targetPlatform === 'cdktn') {
      return this.convertToCfncompat(expr, context);
    }

    // Default: return as-is
    return expr;
  }

  /**
   * Convert CloudFormation intrinsic functions to cfncompat provider functions.
   *
   * Maps CloudFormation functions to provider::cfncompat::* equivalents.
   * Excluded intrinsics (Ref, GetAtt, GetAZs, etc.) are handled at synthesis time.
   */
  private convertToCfncompat(expr: FunctionCallExpression, context: ILoweringContext): Expression {
    // Mapping from CloudFormation intrinsics to cfncompat provider functions
    // Based on: https://github.com/cdktn-io/terraform-provider-cfncompat/blob/main/README.md
    const cfncompatMappings: Record<string, string> = {
      // Basic intrinsics
      'Fn::Base64': 'provider::cfncompat::base64',
      'Fn::Cidr': 'provider::cfncompat::cidr',
      'Fn::FindInMap': 'provider::cfncompat::find_in_map',
      'Fn::Join': 'provider::cfncompat::join',
      'Fn::Length': 'provider::cfncompat::length',
      'Fn::Select': 'provider::cfncompat::select',
      'Fn::Split': 'provider::cfncompat::split',
      'Fn::Sub': 'provider::cfncompat::sub',
      'Fn::ToJsonString': 'provider::cfncompat::to_json_string',

      // Condition functions (prefixed with condition_)
      'Fn::And': 'provider::cfncompat::condition_and',
      'Fn::Contains': 'provider::cfncompat::condition_contains',
      'Fn::EachMemberEquals': 'provider::cfncompat::condition_each_member_equals',
      'Fn::EachMemberIn': 'provider::cfncompat::condition_each_member_in',
      'Fn::Equals': 'provider::cfncompat::condition_equals',
      'Fn::If': 'provider::cfncompat::condition_if',
      'Fn::Not': 'provider::cfncompat::condition_not',
      'Fn::Or': 'provider::cfncompat::condition_or',
    };

    // Check if this is a cfncompat-convertible function
    const cfncompatFunction = cfncompatMappings[expr.functionName];

    if (cfncompatFunction) {
      // Convert to cfncompat provider function
      return {
        kind: 'FunctionCall',
        functionName: cfncompatFunction,
        arguments: expr.arguments.map(arg => this.convertExpression(arg, context)),
      };
    }

    // Excluded intrinsics - should be handled at synthesis time, not here
    const excludedIntrinsics = [
      'Ref',           // Reference resolution (synthesis-time)
      'Fn::GetAtt',    // Attribute reference (synthesis-time)
      'Fn::GetAZs',    // AWS API access (use Terraform data source)
      'Fn::ImportValue', // CloudFormation cross-stack exports
      'Fn::Transform', // CloudFormation macros
      'Fn::ForEach',   // Template transform
      'Fn::RefAll',    // Parameter context
      'Fn::ValueOf',   // Parameter context
      'Fn::ValueOfAll', // Parameter context
    ];

    if (excludedIntrinsics.includes(expr.functionName)) {
      // Log diagnostic - these should have been resolved at synthesis time
      context.addDiagnostic({
        severity: 'warning',
        message: `Function ${expr.functionName} should be resolved at synthesis time, not during lowering`,
        source: 'function-conversion',
      });

      // Return as-is - let the serializer handle it
      return {
        kind: 'FunctionCall',
        functionName: expr.functionName,
        arguments: expr.arguments.map(arg => this.convertExpression(arg, context)),
      };
    }

    // Unknown function - return as-is with diagnostic
    context.addDiagnostic({
      severity: 'info',
      message: `Unknown CloudFormation function: ${expr.functionName}`,
      source: 'function-conversion',
    });

    return {
      kind: 'FunctionCall',
      functionName: expr.functionName,
      arguments: expr.arguments.map(arg => this.convertExpression(arg, context)),
    };
  }
}
