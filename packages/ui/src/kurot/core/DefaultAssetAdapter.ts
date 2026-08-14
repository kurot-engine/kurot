import { Texture, ImageLoader, Event } from '@kurot/core';
import type { IAssetAdapter } from './IAssetAdapter.js';

/**
 * Loads image assets as textures with {@link ImageLoader}.
 */
export class DefaultAssetAdapter implements IAssetAdapter {
	// ── Public methods ────────────────────────────────────────────────────

	public getAsset(source: string, callback: (content: Texture | undefined, source: string) => void): void {
		const loader = new ImageLoader();
		loader.addEventListener(Event.COMPLETE, (): void => {
			if (!loader.data) {
				callback(undefined, source);
				return;
			}
			const texture = new Texture();
			texture.setBitmapData(loader.data);
			callback(texture, source);
		});
		loader.load(source);
	}
}
