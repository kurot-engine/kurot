/**
 * Intermediate representation (IR / AST) for a parsed KUI skin.
 *
 * The KUI parser converts XML → SkinIR, then the code generator
 * converts SkinIR → JS source code.
 */

import type { UIPropertyValue } from '@kurot/ui-document';

/**
 * Half-open UTF-16 source range used by compiler diagnostics.
 */
export interface SourceRange {
	readonly start: number;
	readonly end: number;
}

// ── Value types ──────────────────────────────────────────────────────

/**
 * Component tag that could not be resolved while parsing a skin.
 */
export interface UnresolvedTag {
	readonly name: string;
	readonly range: SourceRange;
}

/**
 * A literal KUI property value.
 */
export interface LiteralValue {
	readonly type: 'literal';
	readonly value: UIPropertyValue;
}

/**
 * A percent value (e.g. `width="100%"`).
 */
export interface PercentValue {
	readonly type: 'percent';
	/**
	 * The numeric portion (e.g. `100`).
	 */
	readonly value: number;
}

/**
 * Value forms supported by KUI property assignments.
 */
export type PropertyValue = LiteralValue | PercentValue;

// ── Property assignment ──────────────────────────────────────────────

/**
 * Property value assigned either by default or in a named state.
 */
export interface PropertyAssignment {
	/**
	 * Property name.
	 */
	readonly name: string;
	/**
	 * The value to assign.
	 */
	readonly value: PropertyValue;
}

// ── Node IR ──────────────────────────────────────────────────────────

/**
 * A component instance in the skin.
 */
export interface SkinNode {
	/**
	 * Tag/class name (without namespace, e.g. "Button").
	 */
	readonly className: string;
	/**
	 * Module to import from (e.g. "@kurot/ui").
	 */
	readonly module: string;
	/**
	 * Variable name in generated code (e.g. "btn1").
	 */
	readonly varName: string;
	/**
	 * ID (skin part name, e.g. "myBtn") or undefined.
	 */
	readonly id?: string;
	/**
	 * Properties to set on this node.
	 */
	readonly properties: PropertyAssignment[];
	/**
	 * Children assigned to the default property.
	 */
	readonly children: SkinNode[];
	/**
	 * Children assigned to named properties (property nodes).
	 */
	readonly propertyChildren: PropertyChild[];
}

/**
 * A child assigned to a specific property (via property node syntax).
 */
export interface PropertyChild {
	/**
	 * Property name.
	 */
	readonly propertyName: string;
	/**
	 * The child node(s), usually a single semantic object such as a layout.
	 */
	readonly nodes: SkinNode[];
}

// ── State overrides ──────────────────────────────────────────────────

/**
 * State override that assigns a property on a skin part.
 */
export interface StateSetProperty {
	readonly type: 'SetProperty';
	/**
	 * ID of the target (empty = skin itself).
	 */
	readonly targetId: string;
	/**
	 * Property name.
	 */
	readonly name: string;
	/**
	 * Value to set.
	 */
	readonly value: PropertyValue;
}

/**
 * Override forms accepted by a skin state.
 */
export type StateOverride = StateSetProperty;

// ── State definition ─────────────────────────────────────────────────

/**
 * Named skin state and its generated overrides.
 */
export interface StateDef {
	/**
	 * State name (e.g. "up", "down", "disabled").
	 */
	readonly name: string;
	/**
	 * State-specific overrides.
	 */
	readonly overrides: StateOverride[];
}

// ── Skin IR (top-level) ─────────────────────────────────────────────

/**
 * Complete intermediate representation consumed by the code generator.
 */
export interface SkinIR {
	/**
	 * Skin class name (e.g. "MySkin").
	 */
	readonly className: string;
	/**
	 * Skin width (from root attributes).
	 */
	readonly width?: number;
	/**
	 * Skin height (from root attributes).
	 */
	readonly height?: number;
	/**
	 * Other properties declared on the root Skin element.
	 */
	readonly properties: PropertyAssignment[];
	/**
	 * All imports needed: className → module.
	 */
	readonly imports: Map<string, string>;
	/**
	 * Skin part IDs.
	 */
	readonly skinParts: string[];
	/**
	 * Visual children of the skin.
	 */
	readonly children: SkinNode[];
	/**
	 * Property children of the skin.
	 */
	readonly propertyChildren: PropertyChild[];
	/**
	 * State definitions.
	 */
	readonly states: StateDef[];
	/**
	 * Inline declarations (non-visual).
	 */
	readonly declarations: SkinNode[];
	/**
	 * Tag names that could not be resolved to a component or a project-defined
	 * namespace (see `NamespaceModule`). These are silently dropped from the
	 * generated skin, so callers should surface them as build warnings.
	 */
	readonly unresolvedTags: UnresolvedTag[];
}
