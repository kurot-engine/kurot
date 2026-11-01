import { Base64Util } from '../../utils/Base64Util.js';
import type { DisplayObject } from '../DisplayObject.js';

/**
 * Compressed pixel payload and upload metadata. Dimensions are source pixels.
 */
export class CompressedTextureData {
	/**
	 * WebGL compressed internal-format constant associated with these bytes.
	 */
	public glInternalFormat = 0;
	public width = 0;
	public height = 0;
	/**
	 * Encoded block payload retained by reference, not decoded RGBA pixels.
	 */
	public byteArray: Uint8Array = new Uint8Array(0);
	/**
	 * Face index supplied by the compressed texture decoder.
	 */
	public face = 0;
	/**
	 * Mipmap level supplied by the decoder; 0 identifies the base image.
	 */
	public level = 0;
}

/**
 * Pixel source shared by Texture views, with source-pixel dimensions and an
 * optional renderer upload. Canvas/video edits require invalidate() to refresh
 * uploads. Sharing does not coordinate ownership: dispose only after all users
 * have released the source.
 */
export class BitmapData {
	// ── Static fields ─────────────────────────────────────────────────────────

	private static _displayList = new WeakMap<BitmapData, Set<DisplayObject>>();

	// ── Static methods ────────────────────────────────────────────────────────

	/**
	 * Starts decoding encoded image bytes or bare base64 through a browser Image.
	 * Returns before loading completes; the callback receives initialized dimensions
	 * after a successful load. Load errors have no callback on this helper.
	 */
	public static create(
		type: 'arraybuffer',
		data: ArrayBuffer,
		callback?: (bitmapData: BitmapData) => void,
	): BitmapData;
	public static create(type: 'base64', data: string, callback?: (bitmapData: BitmapData) => void): BitmapData;
	public static create(
		type: 'arraybuffer' | 'base64',
		data: ArrayBuffer | string,
		callback?: (bitmapData: BitmapData) => void,
	): BitmapData {
		const base64 = type === 'arraybuffer' ? Base64Util.encode(data as ArrayBuffer) : (data as string);
		let imageType = 'image/png';
		if (base64.charAt(0) === '/') {
			imageType = 'image/jpeg';
		} else if (base64.charAt(0) === 'R') {
			imageType = 'image/gif';
		}

		const img = new Image();
		img.src = `data:${imageType};base64,${base64}`;
		img.crossOrigin = '*';
		const bitmapData = new BitmapData(img);
		img.onload = () => {
			img.onload = null;
			bitmapData.source = img;
			bitmapData.width = img.width;
			bitmapData.height = img.height;
			callback?.(bitmapData);
		};
		return bitmapData;
	}

	/**
	 * Registers a display user for pixel invalidation. Undefined data is ignored.
	 */
	public static addDisplayObject(displayObject: DisplayObject, bitmapData: BitmapData | undefined): void {
		if (!bitmapData) {
			return;
		}
		let list = BitmapData._displayList.get(bitmapData);
		if (!list) {
			list = new Set<DisplayObject>();
			BitmapData._displayList.set(bitmapData, list);
		}
		list.add(displayObject);
	}

	/**
	 * Removes an invalidation registration without disposing the shared source.
	 */
	public static removeDisplayObject(displayObject: DisplayObject, bitmapData: BitmapData | undefined): void {
		if (!bitmapData) {
			return;
		}
		BitmapData._displayList.get(bitmapData)?.delete(displayObject);
	}

	/**
	 * Advances the upload revision and dirties registered display users after
	 * mutable pixel edits. Undefined data is ignored.
	 */
	public static invalidate(bitmapData: BitmapData | undefined): void {
		if (!bitmapData) {
			return;
		}
		bitmapData.contentVersion++;
		const list = BitmapData._displayList.get(bitmapData);
		if (!list) {
			return;
		}
		for (const node of list) {
			node.$renderDirty = true;
			node.$markDirty();
		}
	}

	/**
	 * Dirties and unregisters display users. Pixel/upload cleanup belongs to the
	 * instance dispose() method; this notification alone does not release them.
	 */
	public static dispose(bitmapData: BitmapData | undefined): void {
		if (!bitmapData) {
			return;
		}
		const list = BitmapData._displayList.get(bitmapData);
		if (!list) {
			return;
		}
		for (const node of list) {
			node.$renderDirty = true;
			node.$markDirty();
		}
		BitmapData._displayList.delete(bitmapData);
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	/**
	 * Physical source width in pixels. Callers maintain it after source changes.
	 */
	public width = 0;
	/**
	 * Physical source height in pixels. Callers maintain it after source changes.
	 */
	public height = 0;
	public format = 'image';

	/**
	 * Whether dispose() closes an ImageBitmap source; defaults to true.
	 * Set false when borrowing decoded pixels whose owner will close them.
	 * Upload cleanup still runs; image/video src values are cleared independently.
	 */
	public deleteSource = true;
	/**
	 * Retained compressed level groups. The base 2D accessor reads [0][0]; adding
	 * or clearing groups alone does not advance contentVersion or invalidate uploads.
	 */
	public readonly compressedTextureData: CompressedTextureData[][] = [];
	public debugCompressedTextureURL = '';
	/**
	 * Optional ETC alpha data. Disposal detaches this reference without disposing it.
	 */
	public etcAlphaMask?: BitmapData;
	/**
	 * Renderer-managed upload shared by every Texture view using these pixels.
	 */
	public webGLTexture?: WebGLTexture;
	/**
	 * Pixel revision advanced by BitmapData.invalidate() after mutable source edits.
	 */
	public contentVersion = 0;

	/**
	 * Declares already-premultiplied input pixels, bypassing alpha conversion.
	 * ImageBitmap has no readable alpha metadata: false (the default) normalizes
	 * it through Canvas 2D, true requires premultiplyAlpha:'premultiply' at creation.
	 */
	public premultipliedAlpha = false;

	private _source?: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | ArrayBuffer;
	private _textureDisposer?: () => void;

	// ── Constructor ───────────────────────────────────────────────────────────

	/**
	 * Captures an optional source and its current dimensions. ArrayBuffer sources
	 * retain zero dimensions until the caller initializes them.
	 */
	public constructor(source?: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | ArrayBuffer) {
		if (source) {
			this._source = source;
			if (!(source instanceof ArrayBuffer)) {
				this.width = (source as HTMLImageElement).width ?? 0;
				this.height = (source as HTMLImageElement).height ?? 0;
			}
		}
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Underlying pixels or encoded data. Replacement does not dispose the previous
	 * source, update dimensions, or invalidate an existing upload.
	 */
	public get source():
		| HTMLImageElement
		| HTMLCanvasElement
		| HTMLVideoElement
		| ImageBitmap
		| ArrayBuffer
		| undefined {
		return this._source;
	}
	public set source(
		value: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | ArrayBuffer | undefined,
	) {
		this._source = value;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Releases the current upload and owned decoded pixels, then invalidates users.
	 * Coordinate disposal with every Texture sharing this BitmapData. Repeated
	 * calls do not repeat upload deletion or close the same ImageBitmap again.
	 * Cleanup continues after individual failures and throws an AggregateError.
	 */
	public dispose(): void {
		// Detach ownership before callbacks so repeated or reentrant cleanup is safe.
		const source = this._source;
		this._source = undefined;
		const releaseTexture = this._textureDisposer;
		this._textureDisposer = undefined;
		const errors: unknown[] = [];
		try {
			releaseTexture?.();
		} catch (error) {
			errors.push(error);
		}
		try {
			if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
				if (this.deleteSource) {
					source.close();
				}
			} else if (source && 'src' in source) {
				source.src = '';
			}
		} catch (error) {
			errors.push(error);
		} finally {
			this.clearCompressedTextureData();
			this.etcAlphaMask = undefined;
			BitmapData.dispose(this);
		}
		if (errors.length > 0) {
			throw new AggregateError(errors, 'BitmapData cleanup failed.');
		}
	}

	/**
	 * First stored compressed payload, or undefined when no base entry exists.
	 */
	public getCompressed2dTextureData(): CompressedTextureData | undefined {
		return this.compressedTextureData[0]?.[0];
	}

	/**
	 * Appends the supplied level group by reference; existing groups are retained.
	 */
	public setCompressed2dTextureData(levelData: CompressedTextureData[]): void {
		this.compressedTextureData.push(levelData);
	}

	/**
	 * Whether the first compressed group contains a base entry.
	 */
	public hasCompressed2d(): boolean {
		return !!this.getCompressed2dTextureData();
	}

	/**
	 * Drops compressed payload references without changing the source or upload.
	 */
	public clearCompressedTextureData(): void {
		this.compressedTextureData.length = 0;
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	/**
	 * @internal
	 * Replaces the current upload's cleanup hook, including after context restore.
	 * Explicit disposal consumes it once before releasing the pixel source.
	 */
	public $setTextureDisposer(dispose: () => void): void {
		this._textureDisposer = dispose;
	}
}
