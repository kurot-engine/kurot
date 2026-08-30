/**
 * Broad serializable value category accepted by a component property.
 */
export type UIPropertyValueType =
	| 'array'
	| 'boolean'
	| 'number'
	| 'object'
	| 'string'
	| 'value';

/**
 * Structural child policy for a component type.
 */
export type UIChildrenPolicy = 'multiple' | 'none' | 'single';

/**
 * Semantic description of one public component property.
 */
export interface UIPropertyDefinition {
	/**
	 * Broad value category used by document validation and Agent tooling.
	 */
	readonly valueType: UIPropertyValueType;

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
	 * Exact key stored in UINode.type, such as eui.Label.
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
	 * Effective properties after applying base-to-derived overrides.
	 */
	readonly properties: Readonly<Record<string, UIPropertyDefinition>>;

	/**
	 * Effective unknown-property policy inherited from the nearest explicit value.
	 */
	readonly allowUnknownProperties: boolean;
}
