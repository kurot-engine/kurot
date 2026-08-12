import { Base64Util } from '../../utils/Base64Util.js';
import type { DisplayObject } from '../DisplayObject.js';

export class CompressedTextureData {
	glInternalFormat = 0;
	width = 0;
	height = 0;
	byteArray: Uint8Array = new Uint8Array(0);
	face = 0;
	level = 0;
}

export class BitmapData {
	// ── Static fields ─────────────────────────────────────────────────────────

	private static _displayList = new WeakMap<BitmapData, Set<DisplayObject>>();

	// ── Static methods ────────────────────────────────────────────────────────

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

	static addDisplayObject(displayObject: DisplayObject, bitmapData: BitmapData | undefined): void {
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

	static removeDisplayObject(displayObject: DisplayObject, bitmapData: BitmapData | undefined): void {
		if (!bitmapData) {
			return;
		}
		BitmapData._displayList.get(bitmapData)?.delete(displayObject);
	}

	static invalidate(bitmapData: BitmapData | undefined): void {
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
	}

	static dispose(bitmapData: BitmapData | undefined): void {
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

	width = 0;
	height = 0;
	format = 'image';
	deleteSource = true;
	readonly compressedTextureData: CompressedTextureData[][] = [];
	debugCompressedTextureURL = '';
	etcAlphaMask?: BitmapData;
	webGLTexture?: WebGLTexture;

	private _source?: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ArrayBuffer;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(source?: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ArrayBuffer) {
		if (source) {
			this._source = source;
			if (!(source instanceof ArrayBuffer)) {
				this.width = (source as HTMLImageElement).width ?? 0;
				this.height = (source as HTMLImageElement).height ?? 0;
			}
		}
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get source(): HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ArrayBuffer | undefined {
		return this._source;
	}
	public set source(value: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ArrayBuffer | undefined) {
		this._source = value;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public dispose(): void {
		if (this._source && 'src' in this._source) {
			(this._source as HTMLImageElement).src = '';
		}
		this._source = undefined;
		this.clearCompressedTextureData();
		this.etcAlphaMask = undefined;
		BitmapData.dispose(this);
	}

	public getCompressed2dTextureData(): CompressedTextureData | undefined {
		return this.compressedTextureData[0]?.[0];
	}

	public setCompressed2dTextureData(levelData: CompressedTextureData[]): void {
		this.compressedTextureData.push(levelData);
	}

	public hasCompressed2d(): boolean {
		return !!this.getCompressed2dTextureData();
	}

	public clearCompressedTextureData(): void {
		this.compressedTextureData.length = 0;
	}
}
