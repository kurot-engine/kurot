import { ResourceItem } from '../ResourceItem.js';
import { AnalyzerBase } from './AnalyzerBase.js';

/**
 * Sound analyzer — loads audio files and caches HTMLAudioElement objects.
 */
export class SoundAnalyzer extends AnalyzerBase {
	/**
	 * Load a sound resource.
	 */
	public loadFile(item: ResourceItem): Promise<ResourceItem> {
		if (this.fileDic.has(item.name)) {
			item.loaded = true;
			return Promise.resolve(item);
		}

		return new Promise<ResourceItem>(resolve => {
			const audio = new Audio();
			audio.preload = 'auto';

			const onCanPlayThrough = (): void => {
				cleanup();
				this.fileDic.set(item.name, audio);
				item.loaded = true;
				resolve(item);
			};

			const onError = (): void => {
				cleanup();
				item.loaded = false;
				resolve(item);
			};

			const cleanup = (): void => {
				audio.removeEventListener('canplaythrough', onCanPlayThrough);
				audio.removeEventListener('error', onError);
			};

			audio.addEventListener('canplaythrough', onCanPlayThrough);
			audio.addEventListener('error', onError);
			audio.src = item.url;
		});
	}

	protected override onResourceDestroy(_resource: unknown): void {
		// Audio elements don't need explicit disposal, but we can release references
		if (_resource instanceof HTMLAudioElement) {
			_resource.pause();
			_resource.src = '';
		}
	}
}
