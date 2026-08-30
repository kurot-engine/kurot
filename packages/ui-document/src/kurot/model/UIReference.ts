import type { UIPropertyObject } from './UIPropertyValue.js';

/**
 * Resource categories that may be referenced by authored UI properties.
 */
export const UI_RESOURCE_TYPES = ['animation', 'font', 'image', 'spine', 'sprite-frame'] as const;

/**
 * One supported authored-resource category.
 */
export type UIResourceType = (typeof UI_RESOURCE_TYPES)[number];

/**
 * Design-token categories understood by UI authoring tools.
 */
export const UI_DESIGN_TOKEN_TYPES = ['color', 'number', 'spacing', 'string', 'typography'] as const;

/**
 * One supported design-token category.
 */
export type UIDesignTokenType = (typeof UI_DESIGN_TOKEN_TYPES)[number];

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
 * Appearance asset selection attached to one runtime component node.
 */
export interface UIAppearanceReference extends Pick<UIAssetReference, 'assetId' | 'kind'> {
	/**
	 * Optional visual variant published by the referenced appearance asset.
	 */
	readonly variant?: string;
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

const ASSET_REFERENCE_KEYS = new Set(['assetId', 'kind']);
const RESOURCE_REFERENCE_KEYS = new Set(['key', 'kind', 'resourceType']);
const TOKEN_REFERENCE_KEYS = new Set(['key', 'kind', 'tokenType']);

/**
 * Narrows an exact generic UI asset reference.
 */
export function isUIAssetReference(value: unknown): value is UIAssetReference {
	return isExactRecord(value, ASSET_REFERENCE_KEYS) && value.kind === 'asset' && isNonEmptyString(value.assetId);
}

/**
 * Narrows an exact project resource reference, including its category.
 */
export function isUIResourceReference(value: unknown): value is UIResourceReference {
	return (
		isExactRecord(value, RESOURCE_REFERENCE_KEYS) &&
		value.kind === 'resource' &&
		isResourceType(value.resourceType) &&
		isNonEmptyString(value.key)
	);
}

/**
 * Narrows an exact design-token reference, including its category.
 */
export function isUIDesignTokenReference(value: unknown): value is UIDesignTokenReference {
	return (
		isExactRecord(value, TOKEN_REFERENCE_KEYS) &&
		value.kind === 'token' &&
		isDesignTokenType(value.tokenType) &&
		isNonEmptyString(value.key)
	);
}

function isExactRecord(value: unknown, knownKeys: ReadonlySet<string>): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value) as object | null;
	return (
		(prototype === Object.prototype || prototype === null) && Object.keys(value).every(key => knownKeys.has(key))
	);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function isResourceType(value: unknown): value is UIResourceType {
	return UI_RESOURCE_TYPES.some(type => type === value);
}

function isDesignTokenType(value: unknown): value is UIDesignTokenType {
	return UI_DESIGN_TOKEN_TYPES.some(type => type === value);
}
