# Shared IIR Documentation

## Overview

Documentation for the Shared Infrastructure Intermediate Representation proof-of-concept.

## Documents

### Architecture

- **[architecture.md](./architecture.md)** - Compiler-inspired pipeline architecture
- **[common-denominator-analysis.md](./common-denominator-analysis.md)** - Design rationale and thin-layer approach
- **[integration-strategy.md](./integration-strategy.md)** - Implementation and adoption strategy

### Related Projects

- **[cdk-from-cfn.md](./cdk-from-cfn.md)** - Comparison with cdk-from-cfn (CloudFormation → CDK)
- **[cdk2pulumi.md](./cdk2pulumi.md)** - Comparison with cdk2pulumi (CDK → Pulumi)

## Key Concepts

- **Extraction**: Walk construct tree, extract semantic model
- **Lowering**: Transform IR through compiler-style phases
- **Serialization**: Generate backend-specific deployment artifacts
- **Expression model**: Type-safe representation of property values (Literal, Reference, FunctionCall)

## Related Projects

- [AWS CDK](https://github.com/aws/aws-cdk/)
- [CDKTN (cdk-terrain)](https://github.com/open-constructs/cdk-terrain/)
- [terraform-provider-cfncompat](https://github.com/cdktn-io/terraform-provider-cfncompat)
- [cdk-from-cfn](https://github.com/cdklabs/cdk-from-cfn/)
- [cdk2pulumi](https://github.com/pulumi/pulumi-tool-cdk2pulumi/)
