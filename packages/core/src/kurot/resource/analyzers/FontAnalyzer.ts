import { parseBitmapFont } from '@kurot/bitmap-font';
import { BitmapFont } from '../../text/BitmapFont.js';
import { Texture } from '../../display/texture/Texture.js';
import { ResourceItem, ResourceType } from '../ResourceItem.js';
import { AnalyzerBase } from './AnalyzerBase.js';
import { TextAnalyzer } from './TextAnalyzer.js';
import { ImageAnalyzer } from './ImageAnalyzer.js';

/**
 * Loads a font descriptor and its referenced page. Each font owns a separate
 * image cache, independent of standalone image entries in the resource manifest.
 */
export class FontAnalyzer extends AnalyzerBase {
	// ── Instance fields ──────────────────────────────────────────────────────
	private readonly _text = new TextAnalyzer();
	private readonly _images = new ImageAnalyzer();
	private readonly _pending = new Map<string, Promise<boolean>>();

	// ── Override methods ─────────────────────────────────────────────────────
	public override async loadFile(item: ResourceItem): Promise<ResourceItem> {
		if (this.hasRes(item.name)) {
			item.loaded = true;
			return item;
		}
		let pending = this._pending.get(item.name);
		if (!pending) {
			pending = this._load(item);
			this._pending.set(item.name, pending);
		}
		try {
			item.loaded = await pending;
		} finally {
			this._pending.delete(item.name);
		}
		return item;
	}

	public override destroyRes(name: string): boolean {
		const removed = super.destroyRes(name);
		if (removed) {
			this._text.destroyRes(name);
			this._images.destroyRes(name);
		}
		return removed;
	}

	// ── Protected methods ───────────────────────────────────────────────────
	protected override onResourceDestroy(value: unknown): void {
		if (value instanceof BitmapFont) {
			value.dispose();
		}
	}

	// ── Private methods ─────────────────────────────────────────────────────
	private async _load(item: ResourceItem): Promise<boolean> {
		try {
			const descriptor = new ResourceItem(item.name, item.url, ResourceType.Text);
			await this._text.loadFile(descriptor);
			if (!descriptor.loaded) return false;
			const data = parseBitmapFont(this._text.getRes(item.name));
			if (!data.file) throw new TypeError('A font resource descriptor must reference its image file.');
			const imageUrl = new URL(data.file, new URL(item.url, document.baseURI)).href;
			const image = new ResourceItem(item.name, imageUrl, ResourceType.Image);
			await this._images.loadFile(image);
			const texture = this._images.getRes<Texture>(item.name);
			if (!image.loaded || !texture) throw new Error('Unable to load bitmap font page.');
			this.fileDic.set(item.name, new BitmapFont(texture, data, { ownsTexture: false }));
			return true;
		} catch {
			this._text.destroyRes(item.name);
			this._images.destroyRes(item.name);
			return false;
		}
	}
}
