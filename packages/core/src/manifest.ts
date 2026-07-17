/**
 * Enhanced manifest model for Shared IIR
 *
 * Complete program representation including resources, components,
 * configuration, outputs, and scoping information.
 */

import type { IirResourceOrComponent } from "./resource";
import type { Expression } from "./expression";
import type { ConfigurationVariable, Scope } from "./scope";

/**
 * Shared IIR Manifest
 *
 * Represents a complete infrastructure program with all its elements:
 * - Resources and components
 * - Configuration inputs
 * - Outputs
 * - Scoping information
 * - Metadata
 */
export interface SharedIirManifest {
  readonly version: string;
  readonly metadata: ProgramMetadata;
  readonly configuration: ConfigurationVariable[];
  readonly resources: IirResourceOrComponent[];
  readonly outputs: OutputValue[];
  readonly rootScope: Scope;
  readonly providers?: ProviderReference[];
  readonly options?: ProgramOptions;
}

export interface ProgramMetadata {
  readonly name: string;
  readonly description?: string;
  readonly sourceFramework?: string;
  readonly sourceFrameworkVersion?: string;
  readonly runtime?: RuntimeRequirements;
  readonly tags?: Record<string, string>;
  readonly annotations?: Record<string, any>;
}

export interface RuntimeRequirements {
  readonly engineVersion?: string;
  readonly plugins?: Record<string, string>;
  readonly requiredEnv?: string[];
}

export interface OutputValue {
  readonly name: string;
  readonly value: Expression;
  readonly description?: string;
  readonly sensitive?: boolean;
  readonly dependsOn?: string[];
}

export interface ProviderReference {
  readonly id: string;
  readonly type: string;
  readonly version?: string;
  readonly config?: Record<string, Expression>;
  readonly alias?: string;
}

export interface ProgramOptions {
  readonly backend?: BackendConfig;
  readonly defaultProtect?: boolean;
  readonly parallelism?: number;
  readonly refresh?: 'auto' | 'always' | 'never';
}

export interface BackendConfig {
  readonly type: string;
  readonly config: Record<string, Expression>;
}

export function createMinimalManifest(
  name: string,
  resources: IirResourceOrComponent[]
): SharedIirManifest {
  return {
    version: '2.0.0',
    metadata: { name },
    configuration: [],
    resources,
    outputs: [],
    rootScope: {
      id: 'program',
      kind: 'program',
      variables: new Map(),
      children: [],
    },
  };
}
