import { Rectangle } from '../../geom/Rectangle.js';
import { BitmapData } from './BitmapData.js';

export let textureScaleFactor = 1;

export class Texture {
	// ── Instance fields ───────────────────────────────────────────────────────

	bitmapX = 0;
	bitmapY = 0;
	bitmapWidth = 0;
	bitmapHeight = 0;
	offsetX = 0;
	offsetY = 0;
	sourceWidth = 0;
	sourceHeight = 0;
	rotated = false;
	bitmapData?: BitmapData;
	disposeBitmapData = true;

	private _textureWidth = 0;
	private _textureHeight = 0;

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get textureWidth(): number {
		return this._textureWidth;
	}
	public get textureHeight(): number {
		return this._textureHeight;
	}

	public get scaleBitmapWidth(): number {
		return this.bitmapWidth * textureScaleFactor;
	}
	public get scaleBitmapHeight(): number {
		return this.bitmapHeight * textureScaleFactor;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public setBitmapData(value: BitmapData): void {
		this.bitmapData = value;
		const scale = textureScaleFactor;
		const w = value.width * scale;
		const h = value.height * scale;
		this.initData(0, 0, w, h, 0, 0, w, h, value.width, value.height);
	}

	public dispose(): void {
		if (this.bitmapData) {
			if (this.disposeBitmapData) {
				this.bitmapData.dispose();
			}
			this.bitmapData = undefined;
		}
	}

	/** @deprecated Use setBitmapData instead. */
	public getPixel32(_x: number, _y: number): number[] {
		throw new Error('getPixel32 is not supported');
	}

	/** @deprecated Requires renderer implementation. */
	public getPixels(_x: number, _y: number, _width = 1, _height = 1): number[] {
		throw new Error('getPixels requires renderer implementation');
	}

	/** @deprecated Requires renderer implementation. */
	public toDataURL(_type: string, _rect?: Rectangle): string {
		throw new Error('toDataURL requires renderer implementation');
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	initData(
		bitmapX: number,
		bitmapY: number,
		bitmapWidth: number,
		bitmapHeight: number,
		offsetX: number,
		offsetY: number,
		textureWidth: number,
		textureHeight: number,
		sourceWidth: number,
		sourceHeight: number,
		rotated = false,
	): void {
		const scale = textureScaleFactor;
		this.bitmapX = bitmapX / scale;
		this.bitmapY = bitmapY / scale;
		this.bitmapWidth = bitmapWidth / scale;
		this.bitmapHeight = bitmapHeight / scale;
		this.offsetX = offsetX;
		this.offsetY = offsetY;
		this._textureWidth = textureWidth;
		this._textureHeight = textureHeight;
		this.sourceWidth = sourceWidth;
		this.sourceHeight = sourceHeight;
		this.rotated = rotated;
		BitmapData.invalidate(this.bitmapData);
	}
}
