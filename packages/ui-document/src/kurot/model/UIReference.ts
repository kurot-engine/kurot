import type { UIPropertyObject } from './UIPropertyValue.js';

/**
 * Resource categories that may be referenced by authored UI properties.
 */
export type UIResourceType =
	| 'animation'
	| 'font'
	| 'image'
	| 'spine'
	| 'sprite-frame';

/**
 * Design-token categories understood by UI authoring tools.
 */
export type UIDesignTokenType =
	| 'color'
	| 'number'
	| 'spacing'
	| 'string'
	| 'typography';

/**
 * Stable reference to another editable Kurot UI asset.
 */
export interface UIAssetReference extends UIPropertyObject {
	/**
	 * Discriminator used by validators and serialization adapters.
	 */
	readonly kind: 'asset';

	/**
	 * Project-stable target document identifier.
	 */
	readonly assetId: string;
}

/**
 * Stable reference to a project resource known to the authoring catalog.
 */
export interface UIResourceReference extends UIPropertyObject {
	/**
	 * Discriminator used by validators and serialization adapters.
	 */
	readonly kind: 'resource';

	/**
	 * Resource category required by the consuming property.
	 */
	readonly resourceType: UIResourceType;

	/**
	 * Project-stable resource key.
	 */
	readonly key: string;
}

/**
 * Stable reference to a project design token.
 */
export interface UIDesignTokenReference extends UIPropertyObject {
	/**
	 * Discriminator used by validators and serialization adapters.
	 */
	readonly kind: 'token';

	/**
	 * Token category required by the consuming property.
	 */
	readonly tokenType: UIDesignTokenType;

	/**
	 * Project-stable token key.
	 */
	readonly key: string;
}
