import type {
	UIAssetReference,
	UIAppearanceReference,
	UIDesignTokenReference,
	UIDesignTokenType,
	UIResourceReference,
	UIResourceType,
} from '../model/UIReference.js';
import { assertNonEmpty } from '../shared/strings.js';

/**
 * Creates a stable reference to another editable UI asset.
 */
export function createUIAssetReference(assetId: string): UIAssetReference {
	assertNonEmpty(assetId, 'Asset id');
	return { kind: 'asset', assetId };
}

/**
 * Creates an appearance reference with an optional published variant.
 */
export function createUIAppearanceReference(
	assetId: string,
	variant?: string,
): UIAppearanceReference {
	assertNonEmpty(assetId, 'Asset id');
	if (variant !== undefined) {
		assertNonEmpty(variant, 'Appearance variant');
	}
	return {
		kind: 'asset',
		assetId,
		...(variant === undefined ? {} : { variant }),
	};
}

/**
 * Creates a typed reference to one project resource.
 */
export function createUIResourceReference(
	resourceType: UIResourceType,
	key: string,
): UIResourceReference {
	assertNonEmpty(resourceType, 'Resource type');
	assertNonEmpty(key, 'Resource key');
	return { kind: 'resource', resourceType, key };
}

/**
 * Creates a typed reference to one project design token.
 */
export function createUIDesignTokenReference(
	tokenType: UIDesignTokenType,
	key: string,
): UIDesignTokenReference {
	assertNonEmpty(tokenType, 'Token type');
	assertNonEmpty(key, 'Token key');
	return { kind: 'token', tokenType, key };
}
