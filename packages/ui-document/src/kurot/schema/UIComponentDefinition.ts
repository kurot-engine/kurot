import type { UIPropertyPrimitive } from '../model/UIPropertyValue.js';
import type {
	UIDesignTokenType,
	UIResourceType,
} from '../model/UIReference.js';

/**
 * Broad serializable value category accepted by a component property.
 */
export type UIPropertyValueType =
	| 'array'
	| 'asset-reference'
	| 'boolean'
	| 'number'
	| 'object'
	| 'resource-reference'
	| 'string'
	| 'token-reference'
	| 'value';

/**
 * Semantic presentation used by editors for otherwise generic values.
 */
export type UIPropertyFormat =
	| 'color'
	| 'layout'
	| 'rectangle'
	| 'resource'
	| 'token';

/**
 * Structural child policy for a component type.
 */
export type UIChildrenPolicy = 'multiple' | 'none' | 'single';

/**
 * Bounded interaction event that a component can expose to semantic actions.
 */
export type UIComponentEvent = 'change' | 'tap';

/**
 * One named runtime part accepted by a component appearance.
 */
export interface UIAppearancePartDefinition {
	/**
	 * Whether every appearance for the component must publish this part.
	 */
	readonly required?: boolean;

	/**
	 * Component type required for the authored part node.
	 */
	readonly type?: string;
}

/**
 * Appearance capabilities exposed by one runtime component type.
 */
export interface UIAppearanceDefinition {
	/**
	 * Named runtime parts that an appearance may publish.
	 */
	readonly parts?: Readonly<Record<string, UIAppearancePartDefinition>>;

	/**
	 * Exact native view-state names that an appearance may define.
	 */
	readonly states?: readonly string[];
}

/**
 * Semantic description of one public component property.
 */
export interface UIPropertyDefinition {
	/**
	 * Accepted value category, or categories for a union-valued property.
	 */
	readonly valueType: UIPropertyValueType | readonly UIPropertyValueType[];

	/**
	 * Optional semantic presentation used by editors and Agent tools.
	 */
	readonly format?: UIPropertyFormat;

	/**
	 * Resource categories accepted when valueType includes resource-reference.
	 */
	readonly resourceTypes?: readonly UIResourceType[];

	/**
	 * Token categories accepted when valueType includes token-reference.
	 */
	readonly tokenTypes?: readonly UIDesignTokenType[];

	/**
	 * Exact primitive values accepted by this property.
	 */
	readonly enumValues?: readonly UIPropertyPrimitive[];

	/**
	 * Inclusive lower bound for numeric values.
	 */
	readonly minimum?: number;

	/**
	 * Inclusive upper bound for numeric values.
	 */
	readonly maximum?: number;

	/**
	 * Whether numeric values must be integers.
	 */
	readonly integer?: boolean;

	/**
	 * Runtime value used when the property is omitted, when it is serializable.
	 */
	readonly defaultValue?: UIPropertyPrimitive;

	/**
	 * Whether every node of this component type must provide the property.
	 */
	readonly required?: boolean;

	/**
	 * Human-readable semantic guidance not expressible by the value category.
	 */
	readonly description?: string;
}

/**
 * Runtime-independent description of a component type available to documents.
 */
export interface UIComponentDefinition {
	/**
	 * Exact key stored in UINode.type, such as kui.Label.
	 */
	readonly type: string;

	/**
	 * Base component type whose semantic properties and policies are inherited.
	 */
	readonly extends?: string;

	/**
	 * Whether the definition is reusable metadata rather than an instantiable node type.
	 */
	readonly abstract?: boolean;

	/**
	 * Human-readable name shown by editors and Agent tools.
	 */
	readonly displayName?: string;

	/**
	 * Semantic purpose and usage guidance for the component.
	 */
	readonly description?: string;

	/**
	 * Child constraint. Omit while the component's child behavior is unspecified.
	 */
	readonly children?: UIChildrenPolicy;

	/**
	 * Appearance states and parts supported by this component.
	 */
	readonly appearance?: UIAppearanceDefinition;

	/**
	 * Semantic interaction events emitted by this component.
	 */
	readonly events?: readonly UIComponentEvent[];

	/**
	 * Known public properties keyed by their exact document names.
	 */
	readonly properties?: Readonly<Record<string, UIPropertyDefinition>>;

	/**
	 * Whether properties missing from this incomplete definition remain valid.
	 * Defaults to false so completed definitions reject misspellings.
	 */
	readonly allowUnknownProperties?: boolean;
}

/**
 * Fully inherited component definition returned by registry resolution.
 */
export interface UIResolvedComponentDefinition {
	/**
	 * Exact component type requested from the registry.
	 */
	readonly type: string;

	/**
	 * Ancestor types ordered from the root base to the direct base.
	 */
	readonly baseTypes: readonly string[];

	/**
	 * Whether this exact type is metadata-only and cannot appear in a document.
	 */
	readonly abstract: boolean;

	/**
	 * Human-readable name declared directly by this type.
	 */
	readonly displayName?: string;

	/**
	 * Semantic guidance declared directly by this type.
	 */
	readonly description?: string;

	/**
	 * Effective child policy inherited from the nearest defining ancestor.
	 */
	readonly children?: UIChildrenPolicy;

	/**
	 * Effective appearance capabilities inherited from the component hierarchy.
	 */
	readonly appearance?: UIAppearanceDefinition;

	/**
	 * Effective semantic interaction events inherited from all ancestors.
	 */
	readonly events: readonly UIComponentEvent[];

	/**
	 * Effective properties after applying base-to-derived overrides.
	 */
	readonly properties: Readonly<Record<string, UIPropertyDefinition>>;

	/**
	 * Effective unknown-property policy inherited from the nearest explicit value.
	 */
	readonly allowUnknownProperties: boolean;
}
