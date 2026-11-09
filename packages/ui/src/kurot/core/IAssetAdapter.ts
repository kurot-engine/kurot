import type { Texture } from '@kurot/core';

/**
 * Resolves asset identifiers to textures.
 */
export interface IAssetAdapter {
	/**
	 * Complete each request once, with a borrowed texture or undefined on failure.
	 * Return the original source even when looking up a frame through its sheet.
	 * An adapter with a cached texture should call back synchronously.
	 */
	getAsset(source: string, callback: (content: Texture | undefined, source: string) => void): void;
}
