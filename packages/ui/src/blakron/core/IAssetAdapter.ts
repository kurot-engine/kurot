import type { Texture } from '@blakron/core';

/**
 * Adapter interface for resolving asset sources (e.g. image URLs) to Texture instances.
 * Implement this interface and pass it to `setAssetAdapter()` to customize asset loading.
 */
export interface IAssetAdapter {
	/**
	 * Resolve an asset source string to a content value (typically a Texture).
	 * @param source  The asset identifier (URL, resource key, etc.)
	 * @param callback  Called with the resolved content and original source when done.
	 *                  `content` is `undefined` when the asset could not be loaded.
	 */
	getAsset(source: string, callback: (content: Texture | undefined, source: string) => void): void;
}
