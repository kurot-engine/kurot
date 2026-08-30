import type {
	UIAssetContract,
	UIDataBindingDefinition,
	UIParameterDefinition,
	UIPartDefinition,
	UISemanticActionDefinition,
	UISlotDefinition,
	UIStateDefinition,
	UIVariantDefinition,
} from '../model/UIAssetContract.js';

/**
 * Input accepted by createUIAssetContract.
 */
export interface CreateUIAssetContractOptions {
	/**
	 * Typed external data accepted by this asset.
	 */
	readonly dataFields?: UIAssetContract['dataFields'];

	/**
	 * One-way data assignments into the asset tree.
	 */
	readonly dataBindings?: Readonly<Record<string, UIDataBindingDefinition>>;

	/**
	 * Named semantic actions emitted by this asset.
	 */
	readonly actions?: Readonly<Record<string, UISemanticActionDefinition>>;

	/**
	 * Canonical component key published by a component asset.
	 */
	readonly componentType?: string;

	/**
	 * Canonical runtime component type styled by an appearance asset.
	 */
	readonly targetType?: string;

	/**
	 * Typed public parameter definitions.
	 */
	readonly parameters?: Readonly<Record<string, UIParameterDefinition>>;

	/**
	 * Public part definitions.
	 */
	readonly parts?: Readonly<Record<string, UIPartDefinition>>;

	/**
	 * Public slot definitions.
	 */
	readonly slots?: Readonly<Record<string, UISlotDefinition>>;

	/**
	 * Runtime state definitions.
	 */
	readonly states?: Readonly<Record<string, UIStateDefinition>>;

	/**
	 * Author-selected variant definitions.
	 */
	readonly variants?: Readonly<Record<string, UIVariantDefinition>>;
}

/**
 * Creates an explicit asset contract with independent top-level collections.
 */
export function createUIAssetContract(
	options: CreateUIAssetContractOptions = {},
): UIAssetContract {
	return {
		...(options.componentType === undefined
			? {}
			: { componentType: options.componentType }),
		...(options.targetType === undefined ? {} : { targetType: options.targetType }),
		parameters: { ...options.parameters },
		parts: { ...options.parts },
		slots: { ...options.slots },
		states: { ...options.states },
		variants: { ...options.variants },
		dataFields: { ...options.dataFields },
		dataBindings: { ...options.dataBindings },
		actions: { ...options.actions },
	};
}
