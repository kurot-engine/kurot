import type { UIPropertyValue } from './UIPropertyValue.js';

/**
 * A component instance in a semantic UI document.
 */
export interface UINode {
	/**
	 * Stable identifier, unique within the containing document.
	 */
	readonly id: string;

	/**
	 * Component type key resolved by a renderer or format adapter.
	 */
	readonly type: string;

	/**
	 * Explicit component properties keyed by public property name.
	 */
	readonly properties: Readonly<Record<string, UIPropertyValue>>;

	/**
	 * Ordered visual children of this component instance.
	 */
	readonly children: readonly UINode[];
}
