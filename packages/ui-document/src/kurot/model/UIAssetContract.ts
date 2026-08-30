import type { UIPropertyDefinition } from '../schema/UIComponentDefinition.js';
import type { UIPropertyValue } from './UIPropertyValue.js';

/**
 * Internal property receiving a reusable component parameter value.
 */
export interface UIParameterBinding {
	/**
	 * Stable node identifier inside the component definition.
	 */
	readonly targetId: string;

	/**
	 * Public property receiving the resolved parameter value.
	 */
	readonly property: string;
}

/**
 * Typed public component parameter and its explicit internal destinations.
 */
export interface UIParameterDefinition extends UIPropertyDefinition {
	/**
	 * Internal properties updated when an instance supplies this parameter.
	 */
	readonly bindings?: readonly UIParameterBinding[];
}

/**
 * A node property override activated by a state or variant.
 */
export interface UIPropertyOverride {
	/**
	 * Stable node identifier inside the defining document.
	 */
	readonly targetId: string;

	/**
	 * Public property to override.
	 */
	readonly property: string;

	/**
	 * Serializable replacement value.
	 */
	readonly value: UIPropertyValue;
}

/**
 * Named node exposed by an editable UI asset.
 */
export interface UIPartDefinition {
	/**
	 * Stable node identifier implementing this part.
	 */
	readonly nodeId: string;

	/**
	 * Whether the owning runtime contract requires this part.
	 */
	readonly required?: boolean;

	/**
	 * Authoring guidance for tools and Agents.
	 */
	readonly description?: string;
}

/**
 * Named insertion point exposed by a reusable component.
 */
export interface UISlotDefinition {
	/**
	 * Stable container node receiving projected children.
	 */
	readonly nodeId: string;

	/**
	 * Maximum structural shape accepted by this slot.
	 */
	readonly capacity: 'multiple' | 'single';

	/**
	 * Whether an instance must provide slot content.
	 */
	readonly required?: boolean;

	/**
	 * Authoring guidance for tools and Agents.
	 */
	readonly description?: string;
}

/**
 * Named runtime state expressed as deterministic property overrides.
 */
export interface UIStateDefinition {
	/**
	 * Ordered overrides applied when the state is active.
	 */
	readonly overrides: readonly UIPropertyOverride[];

	/**
	 * Authoring guidance for tools and Agents.
	 */
	readonly description?: string;
}

/**
 * Named authoring variant expressed as deterministic property overrides.
 */
export interface UIVariantDefinition {
	/**
	 * Ordered overrides contributed by this variant.
	 */
	readonly overrides: readonly UIPropertyOverride[];

	/**
	 * Authoring guidance for tools and Agents.
	 */
	readonly description?: string;
}

/**
 * Public authoring contract exposed by one UI asset.
 */
export interface UIAssetContract {
	/**
	 * Canonical component key published by a component asset.
	 */
	readonly componentType?: string;

	/**
	 * Canonical runtime component type styled by an appearance asset.
	 */
	readonly targetType?: string;

	/**
	 * Typed values accepted by consumers of this asset.
	 */
	readonly parameters: Readonly<Record<string, UIParameterDefinition>>;

	/**
	 * Stable internal nodes intentionally exposed to consumers.
	 */
	readonly parts: Readonly<Record<string, UIPartDefinition>>;

	/**
	 * Stable insertion points available to component instances.
	 */
	readonly slots: Readonly<Record<string, UISlotDefinition>>;

	/**
	 * Runtime states supported by this asset.
	 */
	readonly states: Readonly<Record<string, UIStateDefinition>>;

	/**
	 * Author-selected visual or structural variants.
	 */
	readonly variants: Readonly<Record<string, UIVariantDefinition>>;
}
