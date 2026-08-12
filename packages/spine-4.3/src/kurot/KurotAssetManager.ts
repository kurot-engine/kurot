import { AssetManagerBase, TextureAtlas } from '@esotericsoftware/spine-core';
import { HttpRequest, HttpResponseType, ImageLoader, BitmapData, IOErrorEvent, Event } from '@kurot/core';
import { KurotTexture } from './KurotTexture.js';

// AssetManagerBase marks start/success/error/toLoad/loaded/errors/cache as
// private in its .d.ts, but they are public at runtime. This interface
// reflects the actual runtime shape so we can avoid `as unknown as` casts
// throughout the class body.
interface AssetManagerRuntime {
	pathPrefix: string;
	toLoad: number;
	loaded: number;
	errors: Record<string, string>;
	cache: { assets: Record<string, unknown> };
	start(path: string): string;
	success(callback: ((path: string, asset: any) => void) | null, path: string, asset: unknown): void;
	error(callback: ((path: string, message: string) => void) | null, path: string, message: string): void;
}

/**
 * Loads Spine assets (.atlas, .json, .skel, .png) using `@kurot/core`'s
 * `HttpRequest` and `ImageLoader`.
 *
 * @example
 * ```ts
 * const mgr = new KurotAssetManager('assets/spine/');
 * mgr.loadTextureAtlas('hero.atlas');
 * mgr.loadJson('hero.json');
 *
 * // Poll until complete, then build skeleton:
 * if (mgr.isLoadingComplete()) { ... }
 * ```
 */
export class KurotAssetManager extends AssetManagerBase {
	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(pathPrefix = '') {
		super((image: HTMLImageElement | ImageBitmap) => {
			const bd = new BitmapData(image as HTMLImageElement);
			if (image instanceof HTMLImageElement) {
				bd.width = image.naturalWidth || image.width;
				bd.height = image.naturalHeight || image.height;
			}
			return new KurotTexture(bd);
		}, pathPrefix);
	}

	// ── Private helper ────────────────────────────────────────────────────────

	private get _rt(): AssetManagerRuntime {
		return this as unknown as AssetManagerRuntime;
	}

	// ── Overrides ─────────────────────────────────────────────────────────────

	public override loadTexture(
		path: string,
		success?: (path: string, texture: KurotTexture) => void,
		error?: (path: string, message: string) => void,
	): void {
		const resolvedPath = this._rt.start(path);
		const loader = new ImageLoader();

		loader.addEventListener(Event.COMPLETE, () => {
			const bd = loader.data;
			if (!bd) {
				this._rt.error(error ?? null, path, `Failed to load image: ${path}`);
				return;
			}
			this._rt.success(success ?? null, resolvedPath, new KurotTexture(bd));
		});

		loader.addEventListener(IOErrorEvent.IO_ERROR, () => {
			this._rt.error(error ?? null, path, `Couldn't load image: ${path}`);
		});

		loader.load(resolvedPath);
	}

	public override loadText(
		path: string,
		success?: (path: string, text: string) => void,
		error?: (path: string, message: string) => void,
	): void {
		const resolvedPath = this._rt.start(path);
		const xhr = new HttpRequest();
		xhr.responseType = HttpResponseType.TEXT;

		xhr.addEventListener(Event.COMPLETE, () => {
			this._rt.success(success ?? null, resolvedPath, xhr.response as string);
		});

		xhr.addEventListener(IOErrorEvent.IO_ERROR, () => {
			this._rt.error(error ?? null, path, `Couldn't load text: ${path}`);
		});

		xhr.open(resolvedPath);
		xhr.send();
	}

	public override loadJson(
		path: string,
		success?: (path: string, object: object) => void,
		error?: (path: string, message: string) => void,
	): void {
		const resolvedPath = this._rt.start(path);
		const xhr = new HttpRequest();
		xhr.responseType = HttpResponseType.TEXT;

		xhr.addEventListener(Event.COMPLETE, () => {
			try {
				this._rt.success(success ?? null, resolvedPath, JSON.parse(xhr.response as string));
			} catch (e) {
				this._rt.error(error ?? null, resolvedPath, `Couldn't parse JSON ${path}: ${(e as Error).message}`);
			}
		});

		xhr.addEventListener(IOErrorEvent.IO_ERROR, () => {
			this._rt.error(error ?? null, resolvedPath, `Couldn't load JSON: ${path}`);
		});

		xhr.open(resolvedPath);
		xhr.send();
	}

	public override loadBinary(
		path: string,
		success?: (path: string, binary: Uint8Array) => void,
		error?: (path: string, message: string) => void,
	): void {
		const resolvedPath = this._rt.start(path);
		const xhr = new HttpRequest();
		xhr.responseType = HttpResponseType.ARRAY_BUFFER;

		xhr.addEventListener(Event.COMPLETE, () => {
			const buf = xhr.response as ArrayBuffer;
			this._rt.success(success ?? null, resolvedPath, new Uint8Array(buf));
		});

		xhr.addEventListener(IOErrorEvent.IO_ERROR, () => {
			this._rt.error(error ?? null, path, `Couldn't load binary: ${path}`);
		});

		xhr.open(resolvedPath);
		xhr.send();
	}

	public override loadTextureAtlas(
		path: string,
		success?: (path: string, atlas: TextureAtlas) => void,
		error?: (path: string, message: string) => void,
	): void {
		const resolvedPath = this._rt.start(path);
		// parent is computed from the original path (before pathPrefix),
		// so page image names resolve relative to the atlas file, not doubled.
		const parent = path.lastIndexOf('/') >= 0 ? path.substring(0, path.lastIndexOf('/') + 1) : '';

		const xhr = new HttpRequest();
		xhr.responseType = HttpResponseType.TEXT;

		xhr.addEventListener(Event.COMPLETE, () => {
			try {
				const atlas = new TextureAtlas(xhr.response as string);
				let remaining = atlas.pages.length;

				if (remaining === 0) {
					this._rt.success(success ?? null, resolvedPath, atlas);
					return;
				}

				for (const page of atlas.pages) {
					this.loadTexture(
						parent + page.name,
						(_imagePath, texture) => {
							page.setTexture(texture);
							if (--remaining === 0) {
								this._rt.success(success ?? null, resolvedPath, atlas);
							}
						},
						(imagePath, message) => {
							this._rt.error(error ?? null, imagePath, message);
						},
					);
				}
			} catch (e) {
				this._rt.error(
					error ?? null,
					resolvedPath,
					`Couldn't parse texture atlas ${path}: ${(e as Error).message}`,
				);
			}
		});

		xhr.addEventListener(IOErrorEvent.IO_ERROR, () => {
			this._rt.error(error ?? null, resolvedPath, `Couldn't load texture atlas: ${path}`);
		});

		xhr.open(resolvedPath);
		xhr.send();
	}
}
