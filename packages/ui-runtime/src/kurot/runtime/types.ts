import type { DisplayObject } from '@kurot/core';
import type {
	UIComponentRegistry,
	UIPropertyValue,
} from '@kurot/ui-document';

/**
 * Stable runtime materialization failure categories.
 */
export type KurotUIRuntimeErrorCode =
	| 'component-construction-failed'
	| 'invalid-document'
	| 'invalid-layout'
	| 'invalid-property'
	| 'invalid-rectangle'
	| 'unsupported-children'
	| 'unsupported-component';

/**
 * Runtime hooks for one project-defined component type.
 */
export interface KurotUIComponentAdapter {
	/**
	 * Creates a fresh display object for the matching document node.
	 */
	readonly create: () => DisplayObject;

	/**
	 * Applies a project-defined property not handled by the built-in runtime.
	 * Return true when the property was consumed.
	 */
	readonly applyProperty?: (
		instance: DisplayObject,
		name: string,
		value: UIPropertyValue,
		path: string,
	) => boolean;

	/**
	 * Attaches one materialized child to a project-defined container.
	 */
	readonly appendChild?: (
		parent: DisplayObject,
		child: DisplayObject,
		path: string,
	) => void;
}

/**
 * Runtime customization supplied for one materialization operation.
 */
export interface CreateKurotUIOptions {
	/**
	 * Complete semantic registry used to validate the document.
	 */
	readonly registry?: UIComponentRegistry;

	/**
	 * Project-defined runtime adapters keyed by canonical component type.
	 */
	readonly adapters?: Readonly<Record<string, KurotUIComponentAdapter>>;
}

/**
 * Materialized display tree and stable node-to-instance lookup.
 */
export interface KurotUICreationResult {
	/**
	 * Root display object ready to add to a Stage or another container.
	 */
	readonly root: DisplayObject;

	/**
	 * Runtime instances keyed by UIDocument node ID.
	 */
	readonly instances: ReadonlyMap<string, DisplayObject>;
}

/**
 * Internal state shared while recursively materializing one document.
 */
export interface KurotUICreationContext {
	readonly adapters: Readonly<Record<string, KurotUIComponentAdapter>>;
	readonly instances: Map<string, DisplayObject>;
}
