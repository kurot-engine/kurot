import type {
	UIComponentInstance,
	UIInstanceOverride,
} from '../model/UIComponentInstance.js';
import type { UIAssetReference } from '../model/UIReference.js';
import type { UINode } from '../model/UINode.js';
import type { UIPropertyValue } from '../model/UIPropertyValue.js';

/**
 * Input accepted by createUIComponentInstance.
 */
export interface CreateUIComponentInstanceOptions {
	/**
	 * Reusable component asset that defines the internal tree.
	 */
	readonly source: UIAssetReference;

	/**
	 * Typed values passed to the component contract.
	 */
	readonly parameters?: Readonly<Record<string, UIPropertyValue>>;

	/**
	 * Optional selected component variant.
	 */
	readonly variant?: string;

	/**
	 * Public-part overrides local to this instance.
	 */
	readonly overrides?: readonly UIInstanceOverride[];

	/**
	 * Projected child trees keyed by public slot name.
	 */
	readonly slots?: Readonly<Record<string, readonly UINode[]>>;
}

/**
 * Creates an explicit reusable component instance descriptor.
 */
export function createUIComponentInstance(
	options: CreateUIComponentInstanceOptions,
): UIComponentInstance {
	return {
		source: { ...options.source },
		parameters: { ...options.parameters },
		...(options.variant === undefined ? {} : { variant: options.variant }),
		overrides: [...(options.overrides ?? [])],
		slots: Object.fromEntries(
			Object.entries(options.slots ?? {}).map(([name, nodes]) => [name, [...nodes]]),
		),
	};
}
