import { ResourceItem } from '../ResourceItem.js';
import { AnalyzerBase } from './AnalyzerBase.js';
import { ImageLoader } from '../../net/ImageLoader.js';
import { Texture } from '../../display/texture/Texture.js';
import { Event } from '../../events/Event.js';
import { IOErrorEvent } from '../../events/IOErrorEvent.js';

/**
 * Image analyzer — loads images and creates Texture objects.
 */
export class ImageAnalyzer extends AnalyzerBase {
	/**
	 * Load an image resource.
	 */
	public loadFile(item: ResourceItem): Promise<ResourceItem> {
		// Already cached
		if (this.fileDic.has(item.name)) {
			item.loaded = true;
			return Promise.resolve(item);
		}

		return new Promise<ResourceItem>(resolve => {
			const loader = new ImageLoader();

			const onComplete = (): void => {
				cleanup();
				if (loader.data) {
					const texture = new Texture();
					texture.setBitmapData(loader.data);
					this.fileDic.set(item.name, texture);
					item.loaded = true;
				} else {
					item.loaded = false;
				}
				resolve(item);
			};

			const onError = (): void => {
				cleanup();
				item.loaded = false;
				resolve(item);
			};

			const cleanup = (): void => {
				loader.removeEventListener(Event.COMPLETE, onComplete);
				loader.removeEventListener(IOErrorEvent.IO_ERROR, onError);
			};

			loader.addEventListener(Event.COMPLETE, onComplete);
			loader.addEventListener(IOErrorEvent.IO_ERROR, onError);
			loader.load(item.url);
		});
	}

	protected override onResourceDestroy(resource: unknown): void {
		if (resource instanceof Texture) {
			resource.dispose();
		}
	}
}
