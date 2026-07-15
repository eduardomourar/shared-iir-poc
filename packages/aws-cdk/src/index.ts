/**
 * @shared-iir/aws-cdk - AWS CDK extractor for Shared IIR
 *
 * Synthesis-time extraction from AWS CDK construct trees:
 * - Walks tree after construction (synthesis hook)
 * - Extracts CfnResources to semantic model
 * - No construct API changes needed
 * - Optional, opt-in integration
 */

export * from "./extractor";
