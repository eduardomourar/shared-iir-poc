/**
 * Built-in function registry for Shared IIR v2
 *
 * Defines standard cross-platform functions that all backends should support,
 * inspired by Pulumi PCL built-ins and Terraform functions.
 */

import type { Type } from "./expression";

/**
 * Built-in function signature
 */
export interface BuiltinFunction {
  readonly name: string;
  readonly description: string;
  readonly parameters: FunctionParameter[];
  readonly returnType: Type;  // JSII doesn't support function types
  readonly category: FunctionCategory;
  readonly examples?: string[];
}

export interface FunctionParameter {
  readonly name: string;
  readonly type: Type;
  readonly optional?: boolean;
  readonly variadic?: boolean;  // Accepts multiple values
  readonly description?: string;
}

export const FunctionCategories = {
  String: 'string',
  Numeric: 'numeric',
  Collection: 'collection',
  Encoding: 'encoding',
  Filesystem: 'filesystem',
  Hash: 'hash',
  DateTime: 'datetime',
  Type: 'type',
  JSON: 'json',
} as const;

export type FunctionCategory = typeof FunctionCategories[keyof typeof FunctionCategories];

// ============================================================================
// Built-in Function Registry
// ============================================================================

/**
 * Registry of all built-in functions
 */
export class BuiltinFunctionRegistry {
  private functions = new Map<string, BuiltinFunction>();

  constructor() {
    this.registerDefaultFunctions();
  }

  /**
   * Register a built-in function
   */
  register(fn: BuiltinFunction): void {
    this.functions.set(fn.name, fn);
  }

  /**
   * Get a function by name
   */
  getFunction(name: string): BuiltinFunction | undefined {
    return this.functions.get(name);
  }

  /**
   * Check if a function exists
   */
  hasFunction(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Get all functions in a category
   */
  getFunctionsByCategory(category: FunctionCategory): BuiltinFunction[] {
    return Array.from(this.functions.values()).filter(fn => fn.category === category);
  }

  /**
   * Get all function names
   */
  getAllFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Register default cross-platform functions
   */
  private registerDefaultFunctions(): void {
    // String functions
    this.register(STRING_FUNCTIONS.join);
    this.register(STRING_FUNCTIONS.split);
    this.register(STRING_FUNCTIONS.replace);
    this.register(STRING_FUNCTIONS.upper);
    this.register(STRING_FUNCTIONS.lower);
    this.register(STRING_FUNCTIONS.trim);
    this.register(STRING_FUNCTIONS.trimPrefix);
    this.register(STRING_FUNCTIONS.trimSuffix);
    this.register(STRING_FUNCTIONS.substr);
    this.register(STRING_FUNCTIONS.format);

    // Collection functions
    this.register(COLLECTION_FUNCTIONS.length);
    this.register(COLLECTION_FUNCTIONS.concat);
    this.register(COLLECTION_FUNCTIONS.contains);
    this.register(COLLECTION_FUNCTIONS.distinct);
    this.register(COLLECTION_FUNCTIONS.flatten);
    this.register(COLLECTION_FUNCTIONS.keys);
    this.register(COLLECTION_FUNCTIONS.values);
    this.register(COLLECTION_FUNCTIONS.merge);
    this.register(COLLECTION_FUNCTIONS.lookup);
    this.register(COLLECTION_FUNCTIONS.element);
    this.register(COLLECTION_FUNCTIONS.slice);

    // Numeric functions
    this.register(NUMERIC_FUNCTIONS.min);
    this.register(NUMERIC_FUNCTIONS.max);
    this.register(NUMERIC_FUNCTIONS.abs);
    this.register(NUMERIC_FUNCTIONS.ceil);
    this.register(NUMERIC_FUNCTIONS.floor);
    this.register(NUMERIC_FUNCTIONS.parseint);

    // Encoding functions
    this.register(ENCODING_FUNCTIONS.base64encode);
    this.register(ENCODING_FUNCTIONS.base64decode);
    this.register(ENCODING_FUNCTIONS.urlencode);
    this.register(ENCODING_FUNCTIONS.jsondecode);
    this.register(ENCODING_FUNCTIONS.jsonencode);
    this.register(ENCODING_FUNCTIONS.yamldecode);
    this.register(ENCODING_FUNCTIONS.yamlencode);

    // Hash functions
    this.register(HASH_FUNCTIONS.md5);
    this.register(HASH_FUNCTIONS.sha1);
    this.register(HASH_FUNCTIONS.sha256);
    this.register(HASH_FUNCTIONS.sha512);
    this.register(HASH_FUNCTIONS.bcrypt);

    // Filesystem functions
    this.register(FILESYSTEM_FUNCTIONS.file);
    this.register(FILESYSTEM_FUNCTIONS.filebase64);
    this.register(FILESYSTEM_FUNCTIONS.fileexists);
    this.register(FILESYSTEM_FUNCTIONS.dirname);
    this.register(FILESYSTEM_FUNCTIONS.basename);
    this.register(FILESYSTEM_FUNCTIONS.abspath);

    // Type functions
    this.register(TYPE_FUNCTIONS.tostring);
    this.register(TYPE_FUNCTIONS.tonumber);
    this.register(TYPE_FUNCTIONS.tobool);
    this.register(TYPE_FUNCTIONS.tolist);
    this.register(TYPE_FUNCTIONS.tomap);
    this.register(TYPE_FUNCTIONS.toset);

    // DateTime functions
    this.register(DATETIME_FUNCTIONS.timestamp);
    this.register(DATETIME_FUNCTIONS.formatdate);
    this.register(DATETIME_FUNCTIONS.timeadd);
  }
}

// ============================================================================
// Type Helpers
// ============================================================================

const STRING_TYPE: Type = { kind: 'Primitive', primitive: 'string' };
const NUMBER_TYPE: Type = { kind: 'Primitive', primitive: 'number' };
const BOOLEAN_TYPE: Type = { kind: 'Primitive', primitive: 'boolean' };
const ANY_TYPE: Type = { kind: 'Any' };

function arrayType(elementType: Type): Type {
  return { kind: 'Collection', collectionKind: 'array', elementType };
}

function mapType(valueType: Type): Type {
  return { kind: 'Collection', collectionKind: 'map', elementType: valueType };
}

// ============================================================================
// String Functions
// ============================================================================

const STRING_FUNCTIONS = {
  join: {
    name: 'join',
    description: 'Join array elements into a string with a separator',
    parameters: [
      { name: 'separator', type: STRING_TYPE, description: 'String to insert between elements' },
      { name: 'list', type: arrayType(STRING_TYPE), description: 'List of strings to join' },
    ],
    returnType: STRING_TYPE,
    category: FunctionCategories.String,
    examples: ['join(",", ["a", "b", "c"]) // "a,b,c"'],
  } as BuiltinFunction,

  split: {
    name: 'split',
    description: 'Split a string into an array using a separator',
    parameters: [
      { name: 'separator', type: STRING_TYPE },
      { name: 'string', type: STRING_TYPE },
    ],
    returnType: arrayType(STRING_TYPE),
    category: FunctionCategories.String,
    examples: ['split(",", "a,b,c") // ["a", "b", "c"]'],
  } as BuiltinFunction,

  replace: {
    name: 'replace',
    description: 'Replace occurrences of a substring',
    parameters: [
      { name: 'string', type: STRING_TYPE },
      { name: 'search', type: STRING_TYPE },
      { name: 'replace', type: STRING_TYPE },
    ],
    returnType: STRING_TYPE,
    category: FunctionCategories.String,
  } as BuiltinFunction,

  upper: {
    name: 'upper',
    description: 'Convert string to uppercase',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.String,
  } as BuiltinFunction,

  lower: {
    name: 'lower',
    description: 'Convert string to lowercase',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.String,
  } as BuiltinFunction,

  trim: {
    name: 'trim',
    description: 'Remove leading and trailing whitespace',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.String,
  } as BuiltinFunction,

  trimPrefix: {
    name: 'trimPrefix',
    description: 'Remove prefix from string if present',
    parameters: [
      { name: 'string', type: STRING_TYPE },
      { name: 'prefix', type: STRING_TYPE },
    ],
    returnType: STRING_TYPE,
    category: FunctionCategories.String,
  } as BuiltinFunction,

  trimSuffix: {
    name: 'trimSuffix',
    description: 'Remove suffix from string if present',
    parameters: [
      { name: 'string', type: STRING_TYPE },
      { name: 'suffix', type: STRING_TYPE },
    ],
    returnType: STRING_TYPE,
    category: FunctionCategories.String,
  } as BuiltinFunction,

  substr: {
    name: 'substr',
    description: 'Extract substring',
    parameters: [
      { name: 'string', type: STRING_TYPE },
      { name: 'offset', type: NUMBER_TYPE },
      { name: 'length', type: NUMBER_TYPE },
    ],
    returnType: STRING_TYPE,
    category: FunctionCategories.String,
  } as BuiltinFunction,

  format: {
    name: 'format',
    description: 'Format string with arguments',
    parameters: [
      { name: 'format', type: STRING_TYPE },
      { name: 'args', type: ANY_TYPE, variadic: true },
    ],
    returnType: STRING_TYPE,
    category: FunctionCategories.String,
    examples: ['format("Hello %s, you are %d years old", name, age)'],
  } as BuiltinFunction,
};

// ============================================================================
// Collection Functions
// ============================================================================

const COLLECTION_FUNCTIONS = {
  length: {
    name: 'length',
    description: 'Get length of array, map, or string',
    parameters: [{ name: 'value', type: ANY_TYPE }],
    returnType: NUMBER_TYPE,
    category: FunctionCategories.Collection,
  } as BuiltinFunction,

  concat: {
    name: 'concat',
    description: 'Concatenate arrays',
    parameters: [{ name: 'lists', type: arrayType(ANY_TYPE), variadic: true }],
    returnType: arrayType(ANY_TYPE),
    category: FunctionCategories.Collection,
  } as BuiltinFunction,

  contains: {
    name: 'contains',
    description: 'Check if array or map contains a value',
    parameters: [
      { name: 'collection', type: ANY_TYPE },
      { name: 'value', type: ANY_TYPE },
    ],
    returnType: BOOLEAN_TYPE,
    category: FunctionCategories.Collection,
  } as BuiltinFunction,

  distinct: {
    name: 'distinct',
    description: 'Remove duplicate values from array',
    parameters: [{ name: 'list', type: arrayType(ANY_TYPE) }],
    returnType: arrayType(ANY_TYPE) || arrayType(ANY_TYPE),
    category: FunctionCategories.Collection,
  } as BuiltinFunction,

  flatten: {
    name: 'flatten',
    description: 'Flatten nested arrays',
    parameters: [{ name: 'list', type: arrayType(arrayType(ANY_TYPE)) }],
    returnType: arrayType(ANY_TYPE),
    category: FunctionCategories.Collection,
  } as BuiltinFunction,

  keys: {
    name: 'keys',
    description: 'Get keys from a map',
    parameters: [{ name: 'map', type: mapType(ANY_TYPE) }],
    returnType: arrayType(STRING_TYPE),
    category: FunctionCategories.Collection,
  } as BuiltinFunction,

  values: {
    name: 'values',
    description: 'Get values from a map',
    parameters: [{ name: 'map', type: mapType(ANY_TYPE) }],
    returnType: arrayType(ANY_TYPE),
    category: FunctionCategories.Collection,
  } as BuiltinFunction,

  merge: {
    name: 'merge',
    description: 'Merge multiple maps',
    parameters: [{ name: 'maps', type: mapType(ANY_TYPE), variadic: true }],
    returnType: mapType(ANY_TYPE),
    category: FunctionCategories.Collection,
  } as BuiltinFunction,

  lookup: {
    name: 'lookup',
    description: 'Look up value in map with default',
    parameters: [
      { name: 'map', type: mapType(ANY_TYPE) },
      { name: 'key', type: STRING_TYPE },
      { name: 'default', type: ANY_TYPE, optional: true },
    ],
    returnType: ANY_TYPE,
    category: FunctionCategories.Collection,
  } as BuiltinFunction,

  element: {
    name: 'element',
    description: 'Get element from array by index (wraps around)',
    parameters: [
      { name: 'list', type: arrayType(ANY_TYPE) },
      { name: 'index', type: NUMBER_TYPE },
    ],
    returnType: ANY_TYPE,
    category: FunctionCategories.Collection,
  } as BuiltinFunction,

  slice: {
    name: 'slice',
    description: 'Extract slice from array',
    parameters: [
      { name: 'list', type: arrayType(ANY_TYPE) },
      { name: 'start', type: NUMBER_TYPE },
      { name: 'end', type: NUMBER_TYPE },
    ],
    returnType: arrayType(ANY_TYPE) || arrayType(ANY_TYPE),
    category: FunctionCategories.Collection,
  } as BuiltinFunction,
};

// ============================================================================
// Numeric Functions
// ============================================================================

const NUMERIC_FUNCTIONS = {
  min: {
    name: 'min',
    description: 'Return minimum value',
    parameters: [{ name: 'values', type: NUMBER_TYPE, variadic: true }],
    returnType: NUMBER_TYPE,
    category: FunctionCategories.Numeric,
  } as BuiltinFunction,

  max: {
    name: 'max',
    description: 'Return maximum value',
    parameters: [{ name: 'values', type: NUMBER_TYPE, variadic: true }],
    returnType: NUMBER_TYPE,
    category: FunctionCategories.Numeric,
  } as BuiltinFunction,

  abs: {
    name: 'abs',
    description: 'Absolute value',
    parameters: [{ name: 'value', type: NUMBER_TYPE }],
    returnType: NUMBER_TYPE,
    category: FunctionCategories.Numeric,
  } as BuiltinFunction,

  ceil: {
    name: 'ceil',
    description: 'Round up to nearest integer',
    parameters: [{ name: 'value', type: NUMBER_TYPE }],
    returnType: NUMBER_TYPE,
    category: FunctionCategories.Numeric,
  } as BuiltinFunction,

  floor: {
    name: 'floor',
    description: 'Round down to nearest integer',
    parameters: [{ name: 'value', type: NUMBER_TYPE }],
    returnType: NUMBER_TYPE,
    category: FunctionCategories.Numeric,
  } as BuiltinFunction,

  parseint: {
    name: 'parseint',
    description: 'Parse string as integer',
    parameters: [
      { name: 'string', type: STRING_TYPE },
      { name: 'base', type: NUMBER_TYPE },
    ],
    returnType: NUMBER_TYPE,
    category: FunctionCategories.Numeric,
  } as BuiltinFunction,
};

// ============================================================================
// Encoding Functions
// ============================================================================

const ENCODING_FUNCTIONS = {
  base64encode: {
    name: 'base64encode',
    description: 'Encode string as base64',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Encoding,
  } as BuiltinFunction,

  base64decode: {
    name: 'base64decode',
    description: 'Decode base64 string',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Encoding,
  } as BuiltinFunction,

  urlencode: {
    name: 'urlencode',
    description: 'URL encode string',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Encoding,
  } as BuiltinFunction,

  jsondecode: {
    name: 'jsondecode',
    description: 'Parse JSON string',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: ANY_TYPE,
    category: FunctionCategories.JSON,
  } as BuiltinFunction,

  jsonencode: {
    name: 'jsonencode',
    description: 'Encode value as JSON string',
    parameters: [{ name: 'value', type: ANY_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.JSON,
  } as BuiltinFunction,

  yamldecode: {
    name: 'yamldecode',
    description: 'Parse YAML string',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: ANY_TYPE,
    category: FunctionCategories.Encoding,
  } as BuiltinFunction,

  yamlencode: {
    name: 'yamlencode',
    description: 'Encode value as YAML string',
    parameters: [{ name: 'value', type: ANY_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Encoding,
  } as BuiltinFunction,
};

// ============================================================================
// Hash Functions
// ============================================================================

const HASH_FUNCTIONS = {
  md5: {
    name: 'md5',
    description: 'Compute MD5 hash',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Hash,
  } as BuiltinFunction,

  sha1: {
    name: 'sha1',
    description: 'Compute SHA1 hash',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Hash,
  } as BuiltinFunction,

  sha256: {
    name: 'sha256',
    description: 'Compute SHA256 hash',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Hash,
  } as BuiltinFunction,

  sha512: {
    name: 'sha512',
    description: 'Compute SHA512 hash',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Hash,
  } as BuiltinFunction,

  bcrypt: {
    name: 'bcrypt',
    description: 'Hash password with bcrypt',
    parameters: [{ name: 'string', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Hash,
  } as BuiltinFunction,
};

// ============================================================================
// Filesystem Functions
// ============================================================================

const FILESYSTEM_FUNCTIONS = {
  file: {
    name: 'file',
    description: 'Read file contents as string',
    parameters: [{ name: 'path', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Filesystem,
  } as BuiltinFunction,

  filebase64: {
    name: 'filebase64',
    description: 'Read file contents as base64',
    parameters: [{ name: 'path', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Filesystem,
  } as BuiltinFunction,

  fileexists: {
    name: 'fileexists',
    description: 'Check if file exists',
    parameters: [{ name: 'path', type: STRING_TYPE }],
    returnType: BOOLEAN_TYPE,
    category: FunctionCategories.Filesystem,
  } as BuiltinFunction,

  dirname: {
    name: 'dirname',
    description: 'Get directory portion of path',
    parameters: [{ name: 'path', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Filesystem,
  } as BuiltinFunction,

  basename: {
    name: 'basename',
    description: 'Get filename portion of path',
    parameters: [{ name: 'path', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Filesystem,
  } as BuiltinFunction,

  abspath: {
    name: 'abspath',
    description: 'Convert to absolute path',
    parameters: [{ name: 'path', type: STRING_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Filesystem,
  } as BuiltinFunction,
};

// ============================================================================
// Type Conversion Functions
// ============================================================================

const TYPE_FUNCTIONS = {
  tostring: {
    name: 'tostring',
    description: 'Convert value to string',
    parameters: [{ name: 'value', type: ANY_TYPE }],
    returnType: STRING_TYPE,
    category: FunctionCategories.Type,
  } as BuiltinFunction,

  tonumber: {
    name: 'tonumber',
    description: 'Convert value to number',
    parameters: [{ name: 'value', type: ANY_TYPE }],
    returnType: NUMBER_TYPE,
    category: FunctionCategories.Type,
  } as BuiltinFunction,

  tobool: {
    name: 'tobool',
    description: 'Convert value to boolean',
    parameters: [{ name: 'value', type: ANY_TYPE }],
    returnType: BOOLEAN_TYPE,
    category: FunctionCategories.Type,
  } as BuiltinFunction,

  tolist: {
    name: 'tolist',
    description: 'Convert value to array',
    parameters: [{ name: 'value', type: ANY_TYPE }],
    returnType: arrayType(ANY_TYPE),
    category: FunctionCategories.Type,
  } as BuiltinFunction,

  tomap: {
    name: 'tomap',
    description: 'Convert value to map',
    parameters: [{ name: 'value', type: ANY_TYPE }],
    returnType: mapType(ANY_TYPE),
    category: FunctionCategories.Type,
  } as BuiltinFunction,

  toset: {
    name: 'toset',
    description: 'Convert array to set (remove duplicates)',
    parameters: [{ name: 'list', type: arrayType(ANY_TYPE) }],
    returnType: { kind: 'Collection', collectionKind: 'set', elementType: ANY_TYPE },
    category: FunctionCategories.Type,
  } as BuiltinFunction,
};

// ============================================================================
// DateTime Functions
// ============================================================================

const DATETIME_FUNCTIONS = {
  timestamp: {
    name: 'timestamp',
    description: 'Get current timestamp in RFC 3339 format',
    parameters: [],
    returnType: STRING_TYPE,
    category: FunctionCategories.DateTime,
  } as BuiltinFunction,

  formatdate: {
    name: 'formatdate',
    description: 'Format timestamp with format string',
    parameters: [
      { name: 'format', type: STRING_TYPE },
      { name: 'timestamp', type: STRING_TYPE },
    ],
    returnType: STRING_TYPE,
    category: FunctionCategories.DateTime,
  } as BuiltinFunction,

  timeadd: {
    name: 'timeadd',
    description: 'Add duration to timestamp',
    parameters: [
      { name: 'timestamp', type: STRING_TYPE },
      { name: 'duration', type: STRING_TYPE },
    ],
    returnType: STRING_TYPE,
    category: FunctionCategories.DateTime,
  } as BuiltinFunction,
};

// ============================================================================
// Default Export
// ============================================================================

export const BUILTIN_FUNCTIONS = new BuiltinFunctionRegistry();
