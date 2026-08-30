import type { UIAssetReference } from './UIReference.js';
import type { UINode } from './UINode.js';
import type { UIPropertyValue } from './UIPropertyValue.js';

/**
 * Public-part override applied only to one reusable component instance.
 */
export interface UIInstanceOverride {
	/**
	 * Public part name declared by the referenced component.
	 */
	readonly part: string;

	/**
	 * Public property to override on that part.
	 */
	readonly property: string;

	/**
	 * Serializable replacement value.
	 */
	readonly value: UIPropertyValue;
}

/**
 * Reusable component reference and its local authoring differences.
 */
export interface UIComponentInstance {
	/**
	 * Component asset that defines the reusable internal tree.
	 */
	readonly source: UIAssetReference;

	/**
	 * Typed parameter values passed to the component definition.
	 */
	readonly parameters: Readonly<Record<string, UIPropertyValue>>;

	/**
	 * Optional variant selected from the component contract.
	 */
	readonly variant?: string;

	/**
	 * Public-part overrides local to this instance.
	 */
	readonly overrides: readonly UIInstanceOverride[];

	/**
	 * Projected child trees keyed by public slot name.
	 */
	readonly slots: Readonly<Record<string, readonly UINode[]>>;
}
