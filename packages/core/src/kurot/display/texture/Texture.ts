import { hitTestBuffer } from '../../player/canvas/CanvasBuffer.js';
import { BitmapData } from './BitmapData.js';

/**
 * Global frame-coordinate conversion factor, initially 1. Existing frame metadata
 * is not recomputed when it changes; per-source density belongs to Texture.resolution.
 */
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

	/**
	 * Sampling rectangle x in source pixels divided by textureScaleFactor.
	 * Independent of resolution; with the default global factor this is physical pixels.
	 */
	bitmapX = 0;
	/**
	 * Sampling rectangle y in source pixels divided by textureScaleFactor.
	 */
	bitmapY = 0;
	/**
	 * Sampled source width divided by textureScaleFactor, before density scaling.
	 */
	bitmapWidth = 0;
	/**
	 * Sampled source height divided by textureScaleFactor, before density scaling.
	 */
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
	/**
	 * Whether the atlas stores the region rotated clockwise; the logical frame
	 * remains upright. Initially false.
	 */
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

	/**
	 * Sampled trimmed width in logical units, excluding transparent trim margins.
	 */
	public get scaleBitmapWidth(): number {
		return this.bitmapWidth * this.pixelScale;
	}
	/**
	 * Sampled trimmed height in logical units, excluding transparent trim margins.
	 */
	public get scaleBitmapHeight(): number {
		return this.bitmapHeight * this.pixelScale;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Assigns BitmapData as a full-image frame and recomputes dimensions using this
	 * texture's immutable resolution. Does not dispose a previous source. Later
	 * dispose() follows disposeBitmapData, which defaults to owning the source.
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
	 * Set that flag to false for a non-owning view of a shared source. Stored frame
	 * dimensions remain available after detachment; no pixels can be drawn from them.
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
	 * Tests the original alpha of a texture's trimmed, upright content.
	 *
	 * Coordinates are logical content coordinates, truncated toward zero before
	 * density conversion. Subtract animation frame placement before calling; do
	 * not add or subtract Texture.offsetX/offsetY. Each position samples the source
	 * pixel containing it, without smoothing, display transforms, alpha or filters.
	 * Any nonzero alpha, including 1, hits. Outside content, non-finite coordinates
	 * and missing/encoded-only pixel sources return false.
	 *
	 * Uses the same reusable Canvas buffer as Bitmap.pixelHitTest, without retaining
	 * textures or caching pixels. Mutable sources are read on every call. Canvas
	 * drawing/readback errors (including cross-origin SecurityError) propagate;
	 * the buffer is reset even on failure. Caller-owned pixels are never disposed.
	 * Requires a browser Canvas 2D context, independently of the Player backend or
	 * output resolution; no Player initialization is needed.
	 *
	 * @param x Horizontal position relative to the trimmed content's left edge.
	 * @param y Vertical position relative to the trimmed content's top edge.
	 *
	 * @example
	 * ```ts
	 * import { BitmapData, Texture } from '@kurot/core';
	 *
	 * const canvas = document.createElement('canvas');
	 * canvas.width = canvas.height = 1;
	 * const pixels = canvas.getContext('2d');
	 * if (!pixels) {
	 *     throw new Error('Canvas 2D is required');
	 * }
	 * pixels.fillRect(0, 0, 1, 1);
	 * const texture = new Texture();
	 * texture.setBitmapData(new BitmapData(canvas));
	 * console.log(texture.hitTestAlpha(0, 0)); // true
	 * texture.dispose();
	 * ```
	 */
	public hitTestAlpha(x: number, y: number): boolean {
		const source = this.bitmapData?.source;
		const contentX = Math.trunc(x);
		const contentY = Math.trunc(y);
		if (
			!source || source instanceof ArrayBuffer ||
			!Number.isFinite(contentX) || !Number.isFinite(contentY) ||
			contentX < 0 || contentY < 0 ||
			contentX >= this.scaleBitmapWidth || contentY >= this.scaleBitmapHeight ||
			this.bitmapWidth <= 0 || this.bitmapHeight <= 0
		) {
			return false;
		}

		const pixelX = Math.floor(contentX / this.pixelScale);
		const pixelY = Math.floor(contentY / this.pixelScale);
		const sourceX = Math.floor(this.bitmapX + (this.rotated ? this.bitmapHeight - 1 - pixelY : pixelX));
		const sourceY = Math.floor(this.bitmapY + (this.rotated ? pixelX : pixelY));
		const buffer = hitTestBuffer();
		// Resizing keeps the Canvas/context objects but clears state and origin taint,
		// including taint left by another user of the shared hit-test buffer.
		buffer.resize(3, 3);
		try {
			buffer.context.imageSmoothingEnabled = false;
			buffer.context.drawImage(source, sourceX, sourceY, 1, 1, 1, 1, 1, 1);
			return buffer.context.getImageData(1, 1, 1, 1).data[3] !== 0;
		} finally {
			buffer.resize(3, 3);
		}
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
