import { Texture, ImageLoader, Event } from '@blakron/core';
import type { IAssetAdapter } from './IAssetAdapter.js';

/**
 * Default asset adapter that loads images via ImageLoader and
 * resolves them to Texture instances.
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
