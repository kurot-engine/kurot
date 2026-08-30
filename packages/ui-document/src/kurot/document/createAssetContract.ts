import type {
	UIAssetContract,
	UIPartDefinition,
	UISlotDefinition,
	UIStateDefinition,
	UIVariantDefinition,
} from '../model/UIAssetContract.js';
import type { UIPropertyDefinition } from '../schema/UIComponentDefinition.js';

/**
 * Input accepted by createUIAssetContract.
 */
export interface CreateUIAssetContractOptions {
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
	readonly parameters?: Readonly<Record<string, UIPropertyDefinition>>;

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
	};
}
