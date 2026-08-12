import { ResourceItem } from '../ResourceItem.js';
import { AnalyzerBase } from './AnalyzerBase.js';
import { HttpRequest } from '../../net/HttpRequest.js';
import { HttpResponseType } from '../../net/HttpResponseType.js';
import { ImageLoader } from '../../net/ImageLoader.js';
import { Texture } from '../../display/texture/Texture.js';
import { SpriteSheet } from '../../display/texture/SpriteSheet.js';
import { Event } from '../../events/Event.js';
import { IOErrorEvent } from '../../events/IOErrorEvent.js';

/**
 * Sheet config format (standard TexturePacker JSON).
 */
interface SheetConfig {
	file: string;
	frames: Record<
		string,
		{
			x: number;
			y: number;
			w: number;
			h: number;
			offX?: number;
			offY?: number;
			sourceW?: number;
			sourceH?: number;
		}
	>;
}

/**
 * Sheet analyzer — loads a sprite sheet JSON + associated image.
 * Produces a SpriteSheet object with sub-textures.
 */
export class SheetAnalyzer extends AnalyzerBase {
	/** Texture map for individual sub-textures accessible by subkey */
	private textureMap: Map<string, Texture> = new Map<string, Texture>();
	/** Reverse mapping: sheet name → sub-key names */
	private sheetSubkeys: Map<string, string[]> = new Map<string, string[]>();

	/**
	 * Load a sheet resource. This involves two steps:
	 * 1. Load the JSON config via HttpRequest
	 * 2. Load the referenced image via ImageLoader
	 * 3. Parse into a SpriteSheet
	 */
	public loadFile(item: ResourceItem): Promise<ResourceItem> {
		if (this.fileDic.has(item.name)) {
			item.loaded = true;
			return Promise.resolve(item);
		}

		// Step 1: Load the JSON config
		return this.loadSheetConfig(item).then(({ config, imageUrl }) => {
			if (!config || !imageUrl) {
				item.loaded = false;
				return item;
			}
			// Step 2: Load the image
			return this.loadSheetImage(item, imageUrl, config);
		});
	}

	/**
	 * Get a cached resource by name. Supports subkey lookup (e.g., "sheet.textureName").
	 */
	public override getRes<T = unknown>(name: string): T | undefined {
		// Direct lookup
		const direct = this.fileDic.get(name);
		if (direct) return direct as T | undefined;

		// Subkey lookup in texture map
		const tex = this.textureMap.get(name);
		if (tex) return tex as T | undefined;

		// Dot notation: "sheetName.subKey"
		const dotIndex = name.indexOf('.');
		if (dotIndex !== -1) {
			const prefix = name.substring(0, dotIndex);
			const tail = name.substring(dotIndex + 1);
			const sheet = this.fileDic.get(prefix);
			if (sheet instanceof SpriteSheet) {
				return sheet.getTexture(tail) as T | undefined;
			}
		}

		return undefined;
	}

	public override destroyRes(name: string): boolean {
		const sheet = this.fileDic.get(name);
		if (sheet instanceof SpriteSheet) {
			// Clean up sub-key textures from the texture map
			const subkeys = this.sheetSubkeys.get(name);
			if (subkeys) {
				for (const texName of subkeys) {
					this.textureMap.delete(texName);
				}
				this.sheetSubkeys.delete(name);
			}
			this.fileDic.delete(name);
			sheet.dispose();
			return true;
		}
		// Also support destroying individual sub-textures by name
		if (this.textureMap.has(name)) {
			this.textureMap.delete(name);
			return true;
		}
		return false;
	}

	// ── Private helpers ──────────────────────────────────────────────────────

	private loadSheetConfig(item: ResourceItem): Promise<{ config: SheetConfig | undefined; imageUrl: string }> {
		return new Promise(resolve => {
			const request = new HttpRequest();
			request.responseType = HttpResponseType.TEXT;

			const onComplete = (): void => {
				cleanup();
				const response = request.response as string;
				if (!response) {
					resolve({ config: undefined, imageUrl: '' });
					return;
				}
				try {
					const config = JSON.parse(response) as SheetConfig;
					const imageUrl = this.getRelativePath(item.url, config.file);
					resolve({ config, imageUrl });
				} catch {
					resolve({ config: undefined, imageUrl: '' });
				}
			};

			const onError = (): void => {
				cleanup();
				resolve({ config: undefined, imageUrl: '' });
			};

			const cleanup = (): void => {
				request.removeEventListener(Event.COMPLETE, onComplete);
				request.removeEventListener(IOErrorEvent.IO_ERROR, onError);
			};

			request.addEventListener(Event.COMPLETE, onComplete);
			request.addEventListener(IOErrorEvent.IO_ERROR, onError);
			request.open(item.url);
			request.send();
		});
	}

	private loadSheetImage(item: ResourceItem, imageUrl: string, config: SheetConfig): Promise<ResourceItem> {
		return new Promise<ResourceItem>(resolve => {
			const loader = new ImageLoader();

			const onComplete = (): void => {
				cleanup();
				if (loader.data) {
					const texture = new Texture();
					texture.setBitmapData(loader.data);
					this.analyzeBitmap(item, texture, config);
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
			loader.load(imageUrl);
		});
	}

	private analyzeBitmap(item: ResourceItem, texture: Texture, config: SheetConfig): void {
		const name = item.name;
		if (this.fileDic.has(name) || !texture) return;

		const frames = config.frames;
		if (!frames) return;

		const spriteSheet = new SpriteSheet(texture);
		const subkeys: string[] = [];

		for (const subkey in frames) {
			const frame = frames[subkey];
			const subTexture = spriteSheet.createTexture(
				subkey,
				frame.x,
				frame.y,
				frame.w,
				frame.h,
				frame.offX ?? 0,
				frame.offY ?? 0,
				frame.sourceW ?? frame.w,
				frame.sourceH ?? frame.h,
			);
			if (!this.textureMap.has(subkey)) {
				this.textureMap.set(subkey, subTexture);
			}
			subkeys.push(subkey);
		}

		this.sheetSubkeys.set(name, subkeys);
		this.fileDic.set(name, spriteSheet);
	}

	/**
	 * Resolve a relative image path from the sheet URL.
	 */
	private getRelativePath(url: string, file: string): string {
		const normalized = url.split('\\').join('/');
		const index = normalized.lastIndexOf('/');
		if (index !== -1) {
			return normalized.substring(0, index + 1) + file;
		}
		return file;
	}
}
