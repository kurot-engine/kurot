import { Rectangle } from '../../geom/Rectangle.js';
import { BitmapData } from './BitmapData.js';

export let textureScaleFactor = 1;

/**
 * BitmapData-backed frame with immutable source-pixel density. Texture sizes
 * and trim offsets are logical; atlas sampling coordinates stay physical.
 * Sharing BitmapData does not establish automatic ownership coordination.
 *
 * @example
 * ```ts
 * import { Bitmap, BitmapData, Texture } from '@kurot/core';
 *
 * const canvas = document.createElement('canvas');
 * canvas.width = 128;
 * canvas.height = 128;
 * const texture = new Texture(2);
 * texture.setBitmapData(new BitmapData(canvas));
 * const image = new Bitmap(texture);
 * console.log(texture.textureWidth); // 64 logical units
 * image.texture = undefined;
 * texture.dispose();
 * ```
 */
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
	/**
	 * Trimmed content's horizontal offset in logical frame units, initially 0.
	 * Atlas source-pixel offsets are converted when frame data is initialized.
	 */
	offsetX = 0;
	/**
	 * Trimmed content's vertical offset in logical frame units, initially 0.
	 * This differs from the physical atlas sampling origin bitmapY.
	 */
	offsetY = 0;
	/**
	 * Underlying atlas/page width in physical source pixels, initially 0.
	 * Unlike textureWidth, this does not describe a logical display dimension.
	 */
	sourceWidth = 0;
	/**
	 * Underlying atlas/page height in physical source pixels, initially 0.
	 * Unlike textureHeight, this does not describe a logical display dimension.
	 */
	sourceHeight = 0;
	rotated = false;
	/**
	 * Shared pixel source, initially undefined. Prefer setBitmapData() when
	 * replacing a full image so frame dimensions refresh. Assigning a source does
	 * not dispose the previous one or coordinate shared resource ownership.
	 */
	bitmapData?: BitmapData;
	/**
	 * Whether dispose() also disposes the shared BitmapData, true by default.
	 * SpriteSheet child views set false. Choose one owner for any shared pixel source.
	 */
	disposeBitmapData = true;

	private _textureWidth = 0;
	private _textureHeight = 0;

	// ── Constructor ───────────────────────────────────────────────────────────

	/**
	 * Creates an empty texture at source-pixels-per-logical-unit resolution,
	 * defaulting to 1. Non-positive/non-finite resolution throws RangeError; it is
	 * immutable and independent of the Player's backing-store resolution.
	 */
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

	/**
	 * Untrimmed logical frame width, initially 0. Source density is already
	 * accounted for; do not divide this by resolution again.
	 */
	public get textureWidth(): number {
		return this._textureWidth;
	}
	/**
	 * Untrimmed logical frame height, initially 0. Includes the logical original
	 * frame size rather than only the trimmed sampled rectangle.
	 */
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

	/**
	 * Borrows the given BitmapData as a full-image frame and recomputes dimensions
	 * using this texture's immutable resolution. Does not dispose a previous source;
	 * coordinate ownership before replacing shared image data.
	 */
	public setBitmapData(value: BitmapData): void {
		this.bitmapData = value;
		const scale = textureScaleFactor;
		const w = value.width * scale;
		const h = value.height * scale;
		this.initData(0, 0, w, h, 0, 0, w, h, value.width, value.height);
	}

	/**
	 * Detaches bitmapData and disposes it when disposeBitmapData is true (default).
	 * Set that flag to false for a non-owning view of a shared source.
	 */
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
