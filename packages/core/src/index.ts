/**
 * @shared-iir/core - Core Shared IIR library
 *
 * Provides:
 * - Extraction interfaces
 * - IR model (resources, expressions, dependencies, scoping)
 * - Assembly (packaging synthesis output)
 * - Lowering pipeline (transformation phases)
 * - Serializers (backend code generation)
 * - Built-in functions
 */

// Core model - order matters to avoid duplicate exports
export * from "./dependency";
export * from "./expression";
export * from "./resource";
export * from "./manifest";
export * from "./scope";
export * from "./builtin-functions";
export * from "./capability";

// Extraction
export * from "./extractor";

// Assembly
export * from "./assembly/index";

// Lowering
export * from "./lowering/index";

// Serializer
export * from "./serializer/index";
