import type { DisplayObject, Event } from '@kurot/core';
import type {
	UIAssetRegistry,
	UIComponentRegistry,
	UIPropertyValue,
	UIResourceDefinition,
	UIResourceReference,
	UIResourceType,
} from '@kurot/ui-document';

/**
 * Stable runtime materialization failure categories.
 */
export type KurotUIRuntimeErrorCode =
	| 'component-construction-failed'
	| 'invalid-document'
	| 'invalid-data'
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
	 * The value may be a non-serializable object returned by a resource adapter.
	 * Return true when the property was consumed.
	 */
	readonly applyProperty?: (
		instance: DisplayObject,
		name: string,
		value: unknown,
		path: string,
	) => boolean;

	/**
	 * Captures adapter-owned state before a data binding updates the property.
	 * Provide this together with restoreProperty for non-reflective properties.
	 */
	readonly captureProperty?: (
		instance: DisplayObject,
		name: string,
		path: string,
	) => unknown;

	/**
	 * Restores adapter-owned state when a later binding target rejects an update.
	 * Provide this together with captureProperty for non-reflective properties.
	 */
	readonly restoreProperty?: (
		instance: DisplayObject,
		name: string,
		value: unknown,
		path: string,
	) => void;

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
 * Resolves one semantic resource reference to a runtime property value, which
 * may be a non-serializable engine or project object.
 */
export type KurotUIResourceResolver = (
	reference: UIResourceReference,
	definition: UIResourceDefinition,
) => unknown;

/**
 * Resolves one registered resource category into a runtime property value.
 */
export type KurotUIResourceAdapter = KurotUIResourceResolver;

/**
 * Complete category dispatch used by runtime resource resolution.
 */
export type KurotUIResourceAdapters = Readonly<
	Record<UIResourceType, KurotUIResourceAdapter>
>;

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
 * Runtime updates for one document Contract's declared data fields.
 */
export interface KurotUIDataController {
	/**
	 * Declared field names in deterministic order.
	 */
	readonly fields: readonly string[];

	/**
	 * Returns the current value of one declared field.
	 */
	getValue(name: string): UIPropertyValue | undefined;

	/**
	 * Validates and applies one field to every declared binding target.
	 */
	setValue(name: string, value: UIPropertyValue): void;
}

/**
 * One bounded semantic action emitted by a materialized document.
 */
export interface KurotUISemanticAction {
	/**
	 * Contract action name selected by the emitted runtime event.
	 */
	readonly action: string;

	/**
	 * Asset whose Contract declared the action.
	 */
	readonly assetId: string;

	/**
	 * Native Kurot event that triggered the semantic action.
	 */
	readonly event: Event;

	/**
	 * Runtime-qualified reusable-component scope, or an empty root scope.
	 */
	readonly scope: string;

	/**
	 * Asset-local node ID declared as the action source.
	 */
	readonly sourceId: string;
}

/**
 * Runtime customization supplied for one materialization operation.
 */
export interface CreateKurotUIOptions {
	/**
	 * Initial values for data fields declared by the root document.
	 */
	readonly data?: Readonly<Record<string, UIPropertyValue>>;

	/**
	 * Receives bounded semantic actions declared by materialized assets.
	 */
	readonly onAction?: (action: KurotUISemanticAction) => void;

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
	 * Resource-category adapters used to resolve authored references.
	 */
	readonly resourceAdapters?: Partial<KurotUIResourceAdapters>;
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

	/**
	 * Root document data controller.
	 */
	readonly data: KurotUIDataController;

	/**
	 * Data controllers keyed by root scope (`""`) or reusable instance scope.
	 */
	readonly dataControllers: ReadonlyMap<string, KurotUIDataController>;

	/**
	 * Detaches semantic action listeners owned by this materialization.
	 */
	dispose(): void;
}

/**
 * Internal state shared while recursively materializing one project asset graph.
 */
export interface KurotUICreationContext {
	/**
	 * Data controllers registered per materialized asset scope.
	 */
	readonly dataControllers: Map<string, KurotUIDataController>;

	/**
	 * Listener cleanup callbacks owned by this materialization.
	 */
	readonly disposeCallbacks: Array<() => void>;

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
	 * Optional semantic-action sink selected for this materialization.
	 */
	readonly onAction: ((action: KurotUISemanticAction) => void) | undefined;

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
