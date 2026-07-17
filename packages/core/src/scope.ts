/**
 * Scoping and variable model for Shared IIR v2
 *
 * Provides lexical scoping, variable bindings, and configuration inputs
 * following PCL's approach to scope management.
 */

import type { Expression, Type } from "./expression";

/**
 * Scope hierarchy for variable resolution
 */
export interface Scope {
  readonly id: string;
  readonly kind: ScopeKind;
  readonly parent?: Scope;
  readonly variables: Map<string, VariableBinding>;
  readonly children: Scope[];
}

export const ScopeKinds = {
  Program: 'program',
  Component: 'component',
  Block: 'block',
  For: 'for',
} as const;

export type ScopeKind = typeof ScopeKinds[keyof typeof ScopeKinds];

/**
 * Variable binding in a scope
 */
export interface VariableBinding {
  readonly name: string;
  readonly type: Type;
  readonly value: Expression;
  readonly kind: VariableKind;
  readonly scope: string;  // Scope ID where this variable is defined
  readonly metadata?: VariableMetadata;
}

export const VariableKinds = {
  Configuration: 'configuration',  // Program configuration input
  Local: 'local',                  // Local computed value
  LoopVariable: 'loop',            // For expression variable
  ResourceOutput: 'resource',      // Resource attribute reference
} as const;

export type VariableKind = typeof VariableKinds[keyof typeof VariableKinds];

/**
 * Variable metadata
 */
export interface VariableMetadata {
  readonly description?: string;
  readonly default?: Expression;
  readonly sensitive?: boolean;
  readonly sourceLocation?: {
    readonly file: string;
    readonly line: number;
    readonly column: number;
  };
}

// ============================================================================
// Configuration Inputs
// ============================================================================

/**
 * Configuration variable (program input parameter)
 * Maps to PCL config blocks, Terraform variables, Pulumi Config
 */
export interface ConfigurationVariable {
  readonly name: string;
  readonly type: Type;
  readonly description?: string;
  readonly default?: Expression;
  readonly sensitive?: boolean;
  readonly validation?: ConfigurationValidation;
}

/**
 * Configuration validation rules
 */
export interface ConfigurationValidation {
  readonly rules: ValidationRule[];
}

export type ValidationRule =
  | { readonly kind: 'range'; readonly min?: number; readonly max?: number }
  | { readonly kind: 'regex'; readonly pattern: string }
  | { readonly kind: 'length'; readonly min?: number; readonly max?: number }
  | { readonly kind: 'oneOf'; readonly values: any[] }
  | { readonly kind: 'custom'; readonly expression: Expression };

// ============================================================================
// Scope Operations
// ============================================================================

/**
 * Scope manager for building and querying scope hierarchy
 */
export class ScopeManager {
  private scopes = new Map<string, Scope>();
  private currentScope?: Scope;

  /**
   * Create root (program-level) scope
   */
  createRootScope(): Scope {
    const scope: Scope = {
      id: 'program',
      kind: ScopeKinds.Program,
      variables: new Map(),
      children: [],
    };
    this.scopes.set(scope.id, scope);
    this.currentScope = scope;
    return scope;
  }

  /**
   * Enter a new child scope
   */
  enterScope(id: string, kind: ScopeKind): Scope {
    if (!this.currentScope) {
      throw new Error('Cannot enter scope without parent scope');
    }

    const scope: Scope = {
      id,
      kind,
      parent: this.currentScope,
      variables: new Map(),
      children: [],
    };

    this.scopes.set(scope.id, scope);
    this.currentScope.children.push(scope);
    this.currentScope = scope;

    return scope;
  }

  /**
   * Exit current scope (return to parent)
   */
  exitScope(): Scope | undefined {
    if (!this.currentScope) {
      return undefined;
    }

    const previous = this.currentScope;
    this.currentScope = this.currentScope.parent;
    return previous;
  }

  /**
   * Get current scope
   */
  getCurrentScope(): Scope | undefined {
    return this.currentScope;
  }

  /**
   * Bind a variable in the current scope
   */
  bindVariable(binding: VariableBinding): void {
    if (!this.currentScope) {
      throw new Error('Cannot bind variable without current scope');
    }

    if (this.currentScope.variables.has(binding.name)) {
      throw new Error(`Variable "${binding.name}" already exists in scope "${this.currentScope.id}"`);
    }

    this.currentScope.variables.set(binding.name, binding);
  }

  /**
   * Resolve a variable by walking up the scope chain
   */
  resolveVariable(name: string, fromScope?: Scope): VariableBinding | undefined {
    let scope = fromScope || this.currentScope;

    while (scope) {
      const binding = scope.variables.get(name);
      if (binding) {
        return binding;
      }
      scope = scope.parent;
    }

    return undefined;
  }

  /**
   * Get all variables in a scope (including inherited)
   */
  getAllVariables(scope: Scope): Map<string, VariableBinding> {
    const variables = new Map<string, VariableBinding>();

    let current: Scope | undefined = scope;
    while (current) {
      for (const [name, binding] of current.variables) {
        if (!variables.has(name)) {
          variables.set(name, binding);
        }
      }
      current = current.parent;
    }

    return variables;
  }

  /**
   * Get scope by ID
   */
  getScope(id: string): Scope | undefined {
    return this.scopes.get(id);
  }

  /**
   * Check if a variable exists in current scope chain
   */
  hasVariable(name: string): boolean {
    return this.resolveVariable(name) !== undefined;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Create a configuration variable binding
 */
export function createConfigurationBinding(
  name: string,
  type: Type,
  defaultValue?: Expression,
  metadata?: VariableMetadata
): VariableBinding {
  return {
    name,
    type,
    value: defaultValue || { kind: 'Literal', literalValue: null },
    kind: VariableKinds.Configuration,
    scope: 'program',
    metadata,
  };
}

/**
 * Create a local variable binding
 */
export function createLocalBinding(
  name: string,
  type: Type,
  value: Expression,
  scope: string
): VariableBinding {
  return {
    name,
    type,
    value,
    kind: VariableKinds.Local,
    scope,
  };
}

/**
 * Create a loop variable binding
 */
export function createLoopBinding(
  name: string,
  type: Type,
  scope: string
): VariableBinding {
  return {
    name,
    type,
    value: { kind: 'Literal', literalValue: null },  // Loop variables don't have static values
    kind: VariableKinds.LoopVariable,
    scope,
  };
}

/**
 * Get fully qualified variable name (scope + name)
 */
export function getQualifiedName(binding: VariableBinding): string {
  return `${binding.scope}.${binding.name}`;
}

/**
 * Check if a scope is ancestor of another
 */
export function isAncestorScope(ancestor: Scope, descendant: Scope): boolean {
  let current: Scope | undefined = descendant.parent;
  while (current) {
    if (current.id === ancestor.id) {
      return true;
    }
    current = current.parent;
  }
  return false;
}
