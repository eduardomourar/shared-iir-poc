/**
 * Function Conversion Tests
 *
 * Tests the FunctionConversionPhase that converts CloudFormation intrinsic functions
 * to terraform-provider-cfncompat equivalents.
 *
 * Based on: https://github.com/cdktn-io/terraform-provider-cfncompat
 */

import { test } from "node:test";
import assert from "node:assert";
import { FunctionConversionPhase } from "../packages/core/src/lowering/phases/function-conversion.ts";
import { DefaultLoweringContext } from "../packages/core/src/lowering/context.ts";
import { ProviderFeatureRegistry } from "../packages/core/src/capability.ts";
import type { SharedIirManifest } from "../packages/core/src/manifest.ts";
import type { FunctionCallExpression } from "../packages/core/src/expression.ts";

test("Basic intrinsics: Fn::Join → provider::cfncompat::join", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          name: {
            kind: "FunctionCall",
            functionName: "Fn::Join",
            arguments: [
              { kind: "Literal", literalValue: "-" },
              {
                kind: "Literal",
                literalValue: ["prefix", "middle", "suffix"],
              },
            ],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.name as FunctionCallExpression;
  assert.strictEqual(convertedExpr.kind, "FunctionCall");
  assert.strictEqual(
    convertedExpr.functionName,
    "provider::cfncompat::join",
    "Fn::Join should convert to provider::cfncompat::join"
  );
});

test("Basic intrinsics: Fn::Split → provider::cfncompat::split", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          parts: {
            kind: "FunctionCall",
            functionName: "Fn::Split",
            arguments: [
              { kind: "Literal", literalValue: "," },
              { kind: "Literal", literalValue: "a,b,c" },
            ],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.parts as FunctionCallExpression;
  assert.strictEqual(convertedExpr.functionName, "provider::cfncompat::split");
});

test("Basic intrinsics: Fn::Select → provider::cfncompat::select", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          item: {
            kind: "FunctionCall",
            functionName: "Fn::Select",
            arguments: [
              { kind: "Literal", literalValue: 0 },
              { kind: "Literal", literalValue: ["first", "second"] },
            ],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.item as FunctionCallExpression;
  assert.strictEqual(convertedExpr.functionName, "provider::cfncompat::select");
});

test("Advanced intrinsics: Fn::Base64 → provider::cfncompat::base64", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          encoded: {
            kind: "FunctionCall",
            functionName: "Fn::Base64",
            arguments: [{ kind: "Literal", literalValue: "Hello World" }],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.encoded as FunctionCallExpression;
  assert.strictEqual(convertedExpr.functionName, "provider::cfncompat::base64");
});

test("Advanced intrinsics: Fn::Cidr → provider::cfncompat::cidr", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          subnets: {
            kind: "FunctionCall",
            functionName: "Fn::Cidr",
            arguments: [
              { kind: "Literal", literalValue: "10.0.0.0/16" },
              { kind: "Literal", literalValue: 6 },
              { kind: "Literal", literalValue: 8 },
            ],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.subnets as FunctionCallExpression;
  assert.strictEqual(convertedExpr.functionName, "provider::cfncompat::cidr");
});

test("Advanced intrinsics: Fn::Sub → provider::cfncompat::sub", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          message: {
            kind: "FunctionCall",
            functionName: "Fn::Sub",
            arguments: [{ kind: "Literal", literalValue: "Hello ${Name}" }],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.message as FunctionCallExpression;
  assert.strictEqual(convertedExpr.functionName, "provider::cfncompat::sub");
});

test("Condition functions: Fn::If → provider::cfncompat::condition_if", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          value: {
            kind: "FunctionCall",
            functionName: "Fn::If",
            arguments: [
              { kind: "Literal", literalValue: "IsProduction" },
              { kind: "Literal", literalValue: "prod-value" },
              { kind: "Literal", literalValue: "dev-value" },
            ],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.value as FunctionCallExpression;
  assert.strictEqual(convertedExpr.functionName, "provider::cfncompat::condition_if");
});

test("Condition functions: Fn::Equals → provider::cfncompat::condition_equals", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          condition: {
            kind: "FunctionCall",
            functionName: "Fn::Equals",
            arguments: [
              { kind: "Literal", literalValue: "us-east-1" },
              { kind: "Literal", literalValue: "us-east-1" },
            ],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.condition as FunctionCallExpression;
  assert.strictEqual(convertedExpr.functionName, "provider::cfncompat::condition_equals");
});

test("Condition functions: Fn::And → provider::cfncompat::condition_and", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          condition: {
            kind: "FunctionCall",
            functionName: "Fn::And",
            arguments: [
              { kind: "Literal", literalValue: true },
              { kind: "Literal", literalValue: true },
            ],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.condition as FunctionCallExpression;
  assert.strictEqual(convertedExpr.functionName, "provider::cfncompat::condition_and");
});

test("Excluded intrinsics: Ref should not be converted", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          ref: {
            kind: "FunctionCall",
            functionName: "Ref",
            arguments: [{ kind: "Literal", literalValue: "OtherResource" }],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.ref as FunctionCallExpression;
  assert.strictEqual(
    convertedExpr.functionName,
    "Ref",
    "Ref should not be converted (handled at synthesis time)"
  );

  // Should generate a warning diagnostic
  assert.ok(
    context.diagnostics.some(d => d.message.includes("Ref") && d.severity === "warning"),
    "Should generate warning for Ref"
  );
});

test("Excluded intrinsics: Fn::GetAtt should not be converted", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          arn: {
            kind: "FunctionCall",
            functionName: "Fn::GetAtt",
            arguments: [
              { kind: "Literal", literalValue: "MyBucket" },
              { kind: "Literal", literalValue: "Arn" },
            ],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const convertedExpr = output.resources[0].properties.arn as FunctionCallExpression;
  assert.strictEqual(convertedExpr.functionName, "Fn::GetAtt");
});

test("Nested functions: Fn::Join with Fn::Split", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          name: {
            kind: "FunctionCall",
            functionName: "Fn::Join",
            arguments: [
              { kind: "Literal", literalValue: "-" },
              {
                kind: "FunctionCall",
                functionName: "Fn::Split",
                arguments: [
                  { kind: "Literal", literalValue: ":" },
                  { kind: "Literal", literalValue: "arn:aws:s3:::bucket" },
                ],
              } as FunctionCallExpression,
            ],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const outerExpr = output.resources[0].properties.name as FunctionCallExpression;
  assert.strictEqual(outerExpr.functionName, "provider::cfncompat::join");

  const innerExpr = outerExpr.arguments[1] as FunctionCallExpression;
  assert.strictEqual(innerExpr.functionName, "provider::cfncompat::split");
});

test("CloudFormation target: functions should not be converted", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("cloudformation", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [
      {
        id: "MyResource",
        resourceType: { provider: "aws", service: "test", resource: "resource" },
        properties: {
          name: {
            kind: "FunctionCall",
            functionName: "Fn::Join",
            arguments: [
              { kind: "Literal", literalValue: "-" },
              { kind: "Literal", literalValue: ["a", "b"] },
            ],
          } as FunctionCallExpression,
        },
        dependencies: [],
      },
    ],
    outputs: [],
  };

  const output = phase.run(input, context);

  const expr = output.resources[0].properties.name as FunctionCallExpression;
  assert.strictEqual(
    expr.functionName,
    "Fn::Join",
    "Should not convert when target is CloudFormation"
  );
});

test("All basic intrinsics mapping", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const intrinsicMappings = [
    ["Fn::Base64", "provider::cfncompat::base64"],
    ["Fn::Cidr", "provider::cfncompat::cidr"],
    ["Fn::FindInMap", "provider::cfncompat::find_in_map"],
    ["Fn::Join", "provider::cfncompat::join"],
    ["Fn::Length", "provider::cfncompat::length"],
    ["Fn::Select", "provider::cfncompat::select"],
    ["Fn::Split", "provider::cfncompat::split"],
    ["Fn::Sub", "provider::cfncompat::sub"],
    ["Fn::ToJsonString", "provider::cfncompat::to_json_string"],
  ];

  for (const [cfnFunction, expectedTfFunction] of intrinsicMappings) {
    const input: SharedIirManifest = {
      resources: [
        {
          id: "MyResource",
          resourceType: { provider: "aws", service: "test", resource: "resource" },
          properties: {
            test: {
              kind: "FunctionCall",
              functionName: cfnFunction,
              arguments: [{ kind: "Literal", literalValue: "test" }],
            } as FunctionCallExpression,
          },
          dependencies: [],
        },
      ],
      outputs: [],
    };

    const output = phase.run(input, context);
    const expr = output.resources[0].properties.test as FunctionCallExpression;

    assert.strictEqual(
      expr.functionName,
      expectedTfFunction,
      `${cfnFunction} should map to ${expectedTfFunction}`
    );
  }
});

test("All condition intrinsics mapping", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const conditionMappings = [
    ["Fn::And", "provider::cfncompat::condition_and"],
    ["Fn::Contains", "provider::cfncompat::condition_contains"],
    ["Fn::EachMemberEquals", "provider::cfncompat::condition_each_member_equals"],
    ["Fn::EachMemberIn", "provider::cfncompat::condition_each_member_in"],
    ["Fn::Equals", "provider::cfncompat::condition_equals"],
    ["Fn::If", "provider::cfncompat::condition_if"],
    ["Fn::Not", "provider::cfncompat::condition_not"],
    ["Fn::Or", "provider::cfncompat::condition_or"],
  ];

  for (const [cfnFunction, expectedTfFunction] of conditionMappings) {
    const input: SharedIirManifest = {
      resources: [
        {
          id: "MyResource",
          resourceType: { provider: "aws", service: "test", resource: "resource" },
          properties: {
            test: {
              kind: "FunctionCall",
              functionName: cfnFunction,
              arguments: [{ kind: "Literal", literalValue: "test" }],
            } as FunctionCallExpression,
          },
          dependencies: [],
        },
      ],
      outputs: [],
    };

    const output = phase.run(input, context);
    const expr = output.resources[0].properties.test as FunctionCallExpression;

    assert.strictEqual(
      expr.functionName,
      expectedTfFunction,
      `${cfnFunction} should map to ${expectedTfFunction}`
    );
  }
});

test("Output values are also converted", () => {
  const phase = new FunctionConversionPhase();
  const context = new DefaultLoweringContext("terraform", new ProviderFeatureRegistry());

  const input: SharedIirManifest = {
    resources: [],
    outputs: [
      {
        id: "MyOutput",
        value: {
          kind: "FunctionCall",
          functionName: "Fn::Join",
          arguments: [
            { kind: "Literal", literalValue: "-" },
            { kind: "Literal", literalValue: ["prefix", "suffix"] },
          ],
        } as FunctionCallExpression,
      },
    ],
  };

  const output = phase.run(input, context);

  const expr = output.outputs[0].value as FunctionCallExpression;
  assert.strictEqual(expr.functionName, "provider::cfncompat::join");
});
