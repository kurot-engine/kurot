/**
 * KUI Skin parser and ESM factory generator.
 */

import { generateCode } from './codegen.js';
import { parseKUISkin } from './kui-parser.js';
import type { SkinIR } from './ast.js';
import type { CodeGenOptions } from './codegen.js';
import type { NamespaceModule } from './registry.js';

export { SourceLocator, createSourceLocator } from './source-location.js';
export type { SourcePosition } from './source-location.js';

export type {
	SkinIR,
	SkinNode,
	PropertyAssignment,
	PropertyValue,
	PropertyChild,
	LiteralValue,
	PercentValue,
	StateDef,
	StateOverride,
	StateSetProperty,
	UnresolvedTag,
} from './ast.js';

export {
	lookupComponent,
	localName,
	suggestComponentTag,
} from './registry.js';
export type { ComponentInfo, NamespaceModule } from './registry.js';

export { parseKUISkin } from './kui-parser.js';
export { generateCode } from './codegen.js';
export type { CodeGenOptions } from './codegen.js';

export interface CompileKUIOptions extends CodeGenOptions {
	/**
	 * Project-defined KUI component namespaces.
	 */
	readonly customNamespaces?: readonly NamespaceModule[];
}

/**
 * Compiles one KUI Skin source string to an ESM factory module.
 */
export function compileKUI(
	source: string,
	className?: string,
	options?: CompileKUIOptions,
): string {
	const ir = parseKUISkin(source, className, options?.customNamespaces ?? []);
	return generateCode(ir, options);
}

/**
 * Parses one KUI Skin source string into the compiler IR.
 */
export function parseToIR(
	source: string,
	className?: string,
	customNamespaces: readonly NamespaceModule[] = [],
): SkinIR {
	return parseKUISkin(source, className, customNamespaces);
}
