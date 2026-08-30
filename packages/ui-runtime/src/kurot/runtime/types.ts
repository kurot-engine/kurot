import type { DisplayObject } from '@kurot/core';
import type {
	UIAssetRegistry,
	UIComponentRegistry,
	UIPropertyValue,
	UIResourceDefinition,
	UIResourceReference,
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
	| 'unknown-state'
	| 'unsupported-appearance'
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
 * Resolves one semantic resource reference to a runtime property value.
 */
export type KurotUIResourceResolver = (
	reference: UIResourceReference,
	definition: UIResourceDefinition,
) => UIPropertyValue;

/**
 * Dynamic state boundary for one expanded reusable component instance.
 */
export interface KurotUIStateController {
	/**
	 * State currently applied to the reusable component.
	 */
	readonly currentState?: string;

	/**
	 * Contract state names accepted by this controller in stable order.
	 */
	readonly states: readonly string[];

	/**
	 * Restores the active state and applies the requested contract state.
	 */
	setState(name: string): void;

	/**
	 * Removes the active state and restores the pre-state runtime values.
	 */
	clearState(): void;
}

/**
 * Runtime customization supplied for one materialization operation.
 */
export interface CreateKurotUIOptions {
	/**
	 * Complete semantic component registry used to validate every asset.
	 */
	readonly registry?: UIComponentRegistry;

	/**
	 * Project assets, resources, and design tokens used by the root document.
	 */
	readonly assets?: UIAssetRegistry;

	/**
	 * Project-defined runtime adapters keyed by canonical component type.
	 */
	readonly adapters?: Readonly<Record<string, KurotUIComponentAdapter>>;

	/**
	 * Converts a registered resource reference into its browser runtime value.
	 */
	readonly resolveResource?: KurotUIResourceResolver;
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
	 * Runtime instances keyed by document node ID. Reusable component internals
	 * use slash-qualified keys such as `action/label`.
	 */
	readonly instances: ReadonlyMap<string, DisplayObject>;

	/**
	 * Dynamic reusable-component state controllers keyed by instance node ID.
	 */
	readonly stateControllers: ReadonlyMap<string, KurotUIStateController>;
}

/**
 * Internal state shared while recursively materializing one project asset graph.
 */
export interface KurotUICreationContext {
	/**
	 * Runtime adapters keyed by canonical component type.
	 */
	readonly adapters: Readonly<Record<string, KurotUIComponentAdapter>>;

	/**
	 * Validated project catalog used to resolve every reference.
	 */
	readonly assets: UIAssetRegistry;

	/**
	 * Materialized objects keyed by their runtime-qualified node identity.
	 */
	readonly instances: Map<string, DisplayObject>;

	/**
	 * Application resource resolver selected for this materialization.
	 */
	readonly resolveResource: KurotUIResourceResolver;

	/**
	 * Dynamic state controllers registered while reusable instances expand.
	 */
	readonly stateControllers: Map<string, KurotUIStateController>;

	/**
	 * Canonical component types keyed by runtime-qualified node identity.
	 */
	readonly types: Map<string, string>;
}
