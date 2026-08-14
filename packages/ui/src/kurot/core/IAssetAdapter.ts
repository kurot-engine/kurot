import type { Texture } from '@kurot/core';

/**
 * Resolves asset identifiers to textures.
 */
export interface IAssetAdapter {
	/**
	 * Resolves an asset and reports `undefined` when it cannot be loaded.
	 * The callback receives the original source so callers can correlate requests.
	 */
	getAsset(source: string, callback: (content: Texture | undefined, source: string) => void): void;
}
