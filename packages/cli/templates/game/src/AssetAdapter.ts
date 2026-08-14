import { Texture, resource } from '@kurot/core';
import { DefaultAssetAdapter, type IAssetAdapter } from '@kurot/ui';

/**
 * Connects UI asset sources to the project's resource system.
 */
export class AssetAdapter implements IAssetAdapter {

	private readonly fallback = new DefaultAssetAdapter();

	getAsset(
		source: string,
		callback: (content: Texture | undefined, source: string) => void,
	): void {
		const cached = resource.get<Texture>(source);
		if (cached) {
			callback(cached, source);
			return;
		}

		resource.load<Texture>(source)
			.then(content => callback(content, source))
			.catch(() => this.fallback.getAsset(source, callback));
	}
}
