/**
 * EXML skin file parser and code generator.
 *
 * Parses EXML (XML-based skin description format) into an intermediate
 * representation (SkinIR), then generates ESM-compatible JavaScript
 * factory functions.
 *
 * ## Usage
 *
 * ```ts
 * import { parseEXML, generateCode } from './exml/index.js';
 *
 * const ir = parseEXML(exmlSource, 'MySkin');
 * const jsCode = generateCode(ir);
 * ```
 */

import { generateCode } from './codegen.js';
import { parseEXML } from './exml-parser.js';
import type { SkinIR } from './ast.js';
import type { CodeGenOptions } from './codegen.js';
import type { NamespaceModule } from './registry.js';

// ── XML Parser ───────────────────────────────────────────────────────
export { parseXML, filterElements, getTextContent } from './xml-parser.js';
export type { SourceRange, XNode, XText, XAttribute, XElement } from './xml-parser.js';
export { SourceLocator, createSourceLocator } from './source-location.js';
export type { SourcePosition } from './source-location.js';

// ── AST / IR types ───────────────────────────────────────────────────
export type {
	SkinIR,
	SkinNode,
	PropertyAssignment,
	PropertyValue,
	PropertyChild,
	LiteralValue,
	PercentValue,
	BindingValue,
	RefValue,
	StateDef,
	StateOverride,
	StateAddItems,
	StateSetProperty,
	StateSetStateProperty,
	BindingDef,
	UnresolvedTag,
} from './ast.js';

// ── Component Registry ───────────────────────────────────────────────
export {
	lookupComponent,
	getDefaultProperty,
	resolveModule,
	localName,
	isPropertyNode,
	parsePropertyNode,
	suggestComponentTag,
} from './registry.js';
export type { ComponentInfo, NamespaceModule } from './registry.js';

// ── EXML Parser ──────────────────────────────────────────────────────
export { parseEXML, parseSkinRoot } from './exml-parser.js';

// ── Code Generator ───────────────────────────────────────────────────
export { generateCode } from './codegen.js';
export type { CodeGenOptions } from './codegen.js';

// ── Convenience: parse + generate in one step ────────────────────────

export interface CompileExmlOptions extends CodeGenOptions {
	/**
	 * Project-defined EXML namespaces (see `ProjectConfig.exml.namespaces`).
	 */
	customNamespaces?: readonly NamespaceModule[];
}

/**
 * Compiles an EXML source string directly to JavaScript.
 *
 * @param source - EXML source text.
 * @param className - Optional class name used for the factory function name.
 * @param options - Code generation options and project-defined namespaces.
 * @returns Generated JavaScript source.
 */
export function compileEXML(source: string, className?: string, options?: CompileExmlOptions): string {
	const ir = parseEXML(source, className, options?.customNamespaces ?? []);
	return generateCode(ir, options);
}

/**
 * Parses an EXML source string into its intermediate representation.
 *
 * @param source - EXML source text.
 * @param className - Optional skin class name.
 * @param customNamespaces - Project-defined EXML namespaces.
 * @returns The parsed skin intermediate representation.
 */
export function parseToIR(
	source: string,
	className?: string,
	customNamespaces: readonly NamespaceModule[] = [],
): SkinIR {
	return parseEXML(source, className, customNamespaces);
}
