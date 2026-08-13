/**
 * Intermediate representation (IR / AST) for a parsed EXML skin.
 *
 * The EXML parser converts XML → SkinIR, then the code generator
 * converts SkinIR → JS source code.
 */

import type { SourceRange } from './xml-parser.js';

// ── Value types ──────────────────────────────────────────────────────

/**
 * Component tag that could not be resolved while parsing a skin.
 */
export interface UnresolvedTag {
	readonly name: string;
	readonly range: SourceRange;
}

/**
 * A literal value (string, number, boolean, null).
 */
export interface LiteralValue {
	readonly type: 'literal';
	readonly value: string | number | boolean | null;
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
 * A binding expression (e.g. `"{data.name}"`).
 */
export interface BindingValue {
	readonly type: 'binding';
	/**
	 * The expression string (e.g. `"data.name"`).
	 */
	readonly expression: string;
}

/**
 * A reference to a skin part by id (e.g. for an `AddItems` target).
 */
export interface RefValue {
	readonly type: 'ref';
	/**
	 * The variable name in generated code.
	 */
	readonly varName: string;
}

export type PropertyValue = LiteralValue | PercentValue | BindingValue | RefValue;

// ── Property assignment ──────────────────────────────────────────────

export interface PropertyAssignment {
	/**
	 * Property name.
	 */
	readonly name: string;
	/**
	 * State name (empty = default, e.g. "up" from "label.up").
	 */
	readonly state: string;
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
	/**
	 * `includeIn` state names (only present in these states).
	 */
	readonly includeIn: string[];
	/**
	 * `excludeFrom` state names (excluded from these states).
	 */
	readonly excludeFrom: string[];
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
	 * The child node(s) — usually a single node or text content.
	 */
	readonly nodes: (SkinNode | string)[];
}

// ── State overrides ──────────────────────────────────────────────────

export interface StateAddItems {
	readonly type: 'AddItems';
	/**
	 * ID of the item to add.
	 */
	readonly targetId: string;
	/**
	 * ID of the destination container.
	 */
	readonly destinationId: string;
	/**
	 * Insertion index (-1 = append).
	 */
	readonly position: number;
	/**
	 * Property name on the destination.
	 */
	readonly propertyName: string;
}

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

export interface StateSetStateProperty {
	readonly type: 'SetStateProperty';
	/**
	 * Property name.
	 */
	readonly name: string;
	/**
	 * Value to set.
	 */
	readonly value: PropertyValue;
	/**
	 * State that triggers this.
	 */
	readonly stateName: string;
}

export type StateOverride = StateAddItems | StateSetProperty | StateSetStateProperty;

// ── State definition ─────────────────────────────────────────────────

export interface StateDef {
	/**
	 * State name (e.g. "up", "down", "disabled").
	 */
	readonly name: string;
	/**
	 * State groups this state belongs to.
	 */
	readonly stateGroups: string[];
	/**
	 * State-specific overrides.
	 */
	readonly overrides: StateOverride[];
}

// ── Binding definition ───────────────────────────────────────────────

export interface BindingDef {
	/**
	 * Target variable name.
	 */
	readonly targetVar: string;
	/**
	 * Target property name.
	 */
	readonly targetProp: string;
	/**
	 * Binding expression string.
	 */
	readonly expression: string;
}

// ── Skin IR (top-level) ─────────────────────────────────────────────

export interface SkinIR {
	/**
	 * Skin class name (e.g. "MySkin").
	 */
	readonly className: string;
	/**
	 * Superclass name (default: "Skin").
	 */
	readonly superClassName: string;
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
