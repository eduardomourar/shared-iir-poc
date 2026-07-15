/**
 * @shared-iir/core - Core Shared IIR library
 *
 * Provides:
 * - Extraction interfaces
 * - IR model (resources, expressions, dependencies)
 * - Assembly (packaging synthesis output)
 * - Lowering pipeline (transformation phases)
 * - Serializers (backend code generation)
 */

// Core model
export * from "./model";
export * from "./expression";
export * from "./dependency";
export * from "./manifest";
export * from "./output";
export * from "./capability";

// Extraction
export * from "./extractor";

// Assembly
export * from "./assembly/index";

// Lowering
export * from "./lowering/index";

// Serializer
export * from "./serializer/index";
