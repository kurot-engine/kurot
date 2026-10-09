import { Rectangle } from '../../geom/Rectangle.js';
import { BitmapData } from './BitmapData.js';

export let textureScaleFactor = 1;

export class Texture {
	// ── Instance fields ───────────────────────────────────────────────────────

	/**
	 * Source pixels per logical unit. Immutable for this texture and inherited
	 * by SpriteSheet views; independent of the player's render resolution.
	 */
	public readonly resolution: number;

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

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(resolution = 1) {
		if (!Number.isFinite(resolution) || resolution <= 0) {
			throw new RangeError('Texture resolution must be a finite positive number.');
		}
		this.resolution = resolution;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Logical units per sampled source pixel, including textureScaleFactor.
	 */
	public get pixelScale(): number {
		return textureScaleFactor / this.resolution;
	}

	public get textureWidth(): number {
		return this._textureWidth;
	}
	public get textureHeight(): number {
		return this._textureHeight;
	}

	public get scaleBitmapWidth(): number {
		return this.bitmapWidth * this.pixelScale;
	}
	public get scaleBitmapHeight(): number {
		return this.bitmapHeight * this.pixelScale;
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

	/**
	 * @deprecated Use setBitmapData instead.
	 */
	public getPixel32(_x: number, _y: number): number[] {
		throw new Error('getPixel32 is not supported');
	}

	/**
	 * @deprecated This operation is not supported by Texture.
	 */
	public getPixels(_x: number, _y: number, _width = 1, _height = 1): number[] {
		throw new Error('getPixels requires renderer implementation');
	}

	/**
	 * @deprecated This operation is not supported by Texture.
	 */
	public toDataURL(_type: string, _rect?: Rectangle): string {
		throw new Error('toDataURL requires renderer implementation');
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	/**
	 * Atlas geometry and original frame sizes are in source pixels. Stored
	 * offsets and texture dimensions are logical; page dimensions stay physical.
	 */
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
		this.offsetX = offsetX / this.resolution;
		this.offsetY = offsetY / this.resolution;
		this._textureWidth = textureWidth / this.resolution;
		this._textureHeight = textureHeight / this.resolution;
		this.sourceWidth = sourceWidth;
		this.sourceHeight = sourceHeight;
		this.rotated = rotated;
		BitmapData.invalidate(this.bitmapData);
	}
}
