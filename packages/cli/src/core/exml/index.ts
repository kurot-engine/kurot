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
} from './ast.js';

// ── Component Registry ───────────────────────────────────────────────
export {
	lookupComponent,
	getDefaultProperty,
	resolveModule,
	localName,
	isPropertyNode,
	parsePropertyNode,
} from './registry.js';
export type { ComponentInfo, NamespaceModule } from './registry.js';

// ── EXML Parser ──────────────────────────────────────────────────────
export { parseEXML, parseSkinRoot } from './exml-parser.js';

// ── Code Generator ───────────────────────────────────────────────────
export { generateCode } from './codegen.js';
export type { CodeGenOptions } from './codegen.js';

// ── Convenience: parse + generate in one step ────────────────────────

import { parseEXML } from './exml-parser.js';
import { generateCode } from './codegen.js';
import type { CodeGenOptions } from './codegen.js';
import type { NamespaceModule } from './registry.js';
import type { SkinIR } from './ast.js';

export interface CompileExmlOptions extends CodeGenOptions {
	/**
	 * Project-defined EXML namespaces (see `ProjectConfig.exml.namespaces`).
	 */
	customNamespaces?: readonly NamespaceModule[];
}

/**
 * Compile an EXML source string directly to JavaScript.
 *
 * @param source - EXML source text
 * @param className - Optional class name (used for factory function name)
 * @param options - Code generation options, plus project-defined namespaces
 * @returns Generated JS source string
 */
export function compileEXML(source: string, className?: string, options?: CompileExmlOptions): string {
	const ir = parseEXML(source, className, options?.customNamespaces ?? []);
	return generateCode(ir, options);
}

/**
 * Compile an EXML source string to a SkinIR (parse only, no codegen).
 *
 * @param source - EXML source text
 * @param className - Optional class name
 * @param customNamespaces - Project-defined EXML namespaces
 * @returns SkinIR intermediate representation
 */
export function parseToIR(
	source: string,
	className?: string,
	customNamespaces: readonly NamespaceModule[] = [],
): SkinIR {
	return parseEXML(source, className, customNamespaces);
}
