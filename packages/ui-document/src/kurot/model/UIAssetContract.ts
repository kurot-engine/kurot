import type { UIPropertyDefinition } from '../schema/UIComponentDefinition.js';
import type { UIComponentEvent } from '../schema/UIComponentDefinition.js';
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

	/**
	 * Optional bounded interpolation used when an appearance enters this state.
	 */
	readonly transition?: UIPropertyTransition;
}

/**
 * Supported easing curves for authored appearance transitions.
 */
export type UITransitionEasing = 'ease-in' | 'ease-in-out' | 'ease-out' | 'linear';

/**
 * Numeric property interpolation attached to one state override.
 */
export interface UIPropertyTransition {
	/**
	 * Duration in milliseconds.
	 */
	readonly duration: number;

	/**
	 * Optional delay in milliseconds.
	 */
	readonly delay?: number;

	/**
	 * Deterministic easing curve.
	 */
	readonly easing?: UITransitionEasing;
}

/**
 * One-way binding from declared screen data to a node property.
 */
export interface UIDataBindingDefinition {
	/**
	 * Declared data-field name supplying the value.
	 */
	readonly source: string;

	/**
	 * Stable target node identifier.
	 */
	readonly targetId: string;

	/**
	 * Public property receiving the data value.
	 */
	readonly property: string;
}

/**
 * Runtime-neutral trigger that emits one semantic action.
 */
export type UISemanticActionTrigger = UIComponentEvent;

/**
 * Public semantic action emitted from one node interaction.
 */
export interface UISemanticActionDefinition {
	/**
	 * Stable source node identifier.
	 */
	readonly sourceId: string;

	/**
	 * Bounded interaction trigger observed by the runtime.
	 */
	readonly trigger: UISemanticActionTrigger;

	/**
	 * Authoring guidance for tools and Agents.
	 */
	readonly description?: string;
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

	/**
	 * Typed external data accepted by this asset.
	 */
	readonly dataFields?: Readonly<Record<string, UIPropertyDefinition>>;

	/**
	 * One-way assignments from declared data fields to internal properties.
	 */
	readonly dataBindings?: Readonly<Record<string, UIDataBindingDefinition>>;

	/**
	 * Named semantic actions emitted by bounded node interactions.
	 */
	readonly actions?: Readonly<Record<string, UISemanticActionDefinition>>;
}
