import { Rectangle } from '../geom/Rectangle.js';
import { DisplayObject, RenderObjectType } from './DisplayObject.js';
import { BitmapData } from './texture/BitmapData.js';
import { Texture } from './texture/Texture.js';
import { BitmapFillMode } from './enums/BitmapFillMode.js';
import type { Stage } from './Stage.js';

export let bitmapPixelHitTest: ((bitmap: Bitmap, localX: number, localY: number) => boolean) | undefined;

export function setBitmapPixelHitTest(fn: (bitmap: Bitmap, localX: number, localY: number) => boolean): void {
	bitmapPixelHitTest = fn;
}

/**
 * Displays a Texture without taking ownership of its lifetime.
 * Assign undefined to texture to clear the image. Texture dimensions and
 * nine-slice grids are logical units, independent of the canvas resolution.
 */
export class Bitmap extends DisplayObject {
	// ── Static fields ─────────────────────────────────────────────────────────

	/**
	 * Initial smoothing copied by new Bitmap instances, true by default.
	 * Changing this value does not affect existing bitmaps.
	 */
	public static defaultSmoothing = true;

	// ── Instance fields ───────────────────────────────────────────────────────

	private _texture?: Texture;
	private _smoothing: boolean = Bitmap.defaultSmoothing;
	private _fillMode: BitmapFillMode = BitmapFillMode.SCALE;
	private _scale9Grid?: Rectangle;
	private _pixelHitTest = false;
	private _explicitBitmapWidth = NaN;
	private _explicitBitmapHeight = NaN;

	bitmapData?: BitmapData;
	bitmapX = 0;
	bitmapY = 0;
	bitmapWidth = 0;
	bitmapHeight = 0;
	bitmapOffsetX = 0;
	bitmapOffsetY = 0;
	textureWidth = 0;
	textureHeight = 0;
	sourceWidth = 0;
	sourceHeight = 0;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(value?: Texture) {
		super();
		this.$renderObjectType = RenderObjectType.BITMAP;
		if (value) {
			this.setTexture(value);
		}
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Texture reference, initially undefined. Assignment does not transfer
	 * resource ownership; assigning undefined clears the image without disposing
	 * the old texture or its shared BitmapData.
	 */
	public get texture(): Texture | undefined {
		return this._texture;
	}
	public set texture(value: Texture | undefined) {
		this.setTexture(value);
	}

	/**
	 * Whether scaled texture sampling is smoothed; initially the value of
	 * Bitmap.defaultSmoothing (true). Set false for nearest-neighbor pixel art.
	 */
	public get smoothing(): boolean {
		return this._smoothing;
	}
	public set smoothing(value: boolean) {
		if (value === this._smoothing) {
			return;
		}
		this._smoothing = value;
		this.$markDirty();
	}

	/**
	 * How the texture fills explicit dimensions: 'scale' by default, or 'clip'
	 * and 'repeat'. Nine-slice scaling is used only with 'scale'.
	 */
	public get fillMode(): BitmapFillMode {
		return this._fillMode;
	}
	public set fillMode(value: BitmapFillMode) {
		if (value === this._fillMode) {
			return;
		}
		this._fillMode = value;
		this.$renderDirty = true;
		this.$markDirty();
	}

	/**
	 * Optional nine-slice rectangle in logical texture coordinates, initially
	 * undefined. It is retained by reference; reassign after editing to invalidate
	 * render data. Has an effect only when fillMode is 'scale'.
	 */
	public get scale9Grid(): Rectangle | undefined {
		return this._scale9Grid;
	}
	public set scale9Grid(value: Rectangle | undefined) {
		this._scale9Grid = value;
		this.$renderDirty = true;
		this.$markDirty();
	}

	/**
	 * Whether bitmap hit testing consults the installed pixel-test callback;
	 * false by default. With no callback, bounds hits remain accepted. This does
	 * not enable touchEnabled by itself.
	 */
	public get pixelHitTest(): boolean {
		return this._pixelHitTest;
	}
	public set pixelHitTest(value: boolean) {
		this._pixelHitTest = !!value;
	}

	/**
	 * Drawn width in unscaled logical units, initially the texture frame width.
	 * NaN restores automatic width; negative values are ignored. This resizes the
	 * bitmap's fill region without changing scaleX.
	 */
	public override get width(): number {
		return isNaN(this._explicitBitmapWidth) ? this.$getContentBounds().width : this._explicitBitmapWidth;
	}
	public override set width(value: number) {
		if (value < 0 || value === this._explicitBitmapWidth) {
			return;
		}
		this._explicitBitmapWidth = value;
		this.$renderDirty = true;
		this.$markDirty();
	}

	/**
	 * Drawn height in unscaled logical units, initially the texture frame height.
	 * NaN restores automatic height; negative values are ignored. This resizes the
	 * bitmap's fill region without changing scaleY.
	 */
	public override get height(): number {
		return isNaN(this._explicitBitmapHeight) ? this.$getContentBounds().height : this._explicitBitmapHeight;
	}
	public override set height(value: number) {
		if (value < 0 || value === this._explicitBitmapHeight) {
			return;
		}
		this._explicitBitmapHeight = value;
		this.$renderDirty = true;
		this.$markDirty();
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	override $onAddToStage(stage: Stage, $nestLevel: number): void {
		super.$onAddToStage(stage, $nestLevel);
		if (this._texture?.bitmapData) {
			BitmapData.addDisplayObject(this, this._texture.bitmapData);
		}
	}

	override $onRemoveFromStage(): void {
		super.$onRemoveFromStage();
		if (this._texture?.bitmapData) {
			BitmapData.removeDisplayObject(this, this._texture.bitmapData);
		}
	}

	override $measureContentBounds(bounds: Rectangle): void {
		const w = !isNaN(this._explicitBitmapWidth) ? this._explicitBitmapWidth : this.textureWidth;
		const h = !isNaN(this._explicitBitmapHeight) ? this._explicitBitmapHeight : this.textureHeight;
		bounds.setTo(0, 0, w, h);
	}

	override $hitTest(stageX: number, stageY: number): DisplayObject | undefined {
		const target = super.$hitTest(stageX, stageY);
		if (!target || !this._pixelHitTest) {
			return target;
		}
		const m = this.$getInvertedConcatenatedMatrix();
		const localX = m.a * stageX + m.c * stageY + m.tx;
		const localY = m.b * stageX + m.d * stageY + m.ty;
		return bitmapPixelHitTest?.(this, localX, localY) === false ? undefined : target;
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private setTexture(value: Texture | undefined): void {
		const old = this._texture;
		if (value === old) {
			return;
		}
		this._texture = value;

		if (value) {
			this.refreshImageData();
			if (this.$stage) {
				if (old?.bitmapData && old.bitmapData !== value.bitmapData) {
					BitmapData.removeDisplayObject(this, old.bitmapData);
				}
				if (value.bitmapData) {
					BitmapData.addDisplayObject(this, value.bitmapData);
				}
			}
		} else {
			if (old?.bitmapData) {
				BitmapData.removeDisplayObject(this, old.bitmapData);
			}
			this.clearImageData();
		}

		this.$renderDirty = true;
		this.$markDirty();
	}

	private refreshImageData(): void {
		const t = this._texture;
		if (!t) {
			return;
		}
		this.bitmapData = t.bitmapData;
		this.bitmapX = t.bitmapX;
		this.bitmapY = t.bitmapY;
		this.bitmapWidth = t.bitmapWidth;
		this.bitmapHeight = t.bitmapHeight;
		this.bitmapOffsetX = t.offsetX;
		this.bitmapOffsetY = t.offsetY;
		this.textureWidth = t.textureWidth;
		this.textureHeight = t.textureHeight;
		this.sourceWidth = t.sourceWidth;
		this.sourceHeight = t.sourceHeight;
	}

	private clearImageData(): void {
		this.bitmapData = undefined;
		this.bitmapX = this.bitmapY = this.bitmapWidth = this.bitmapHeight = 0;
		this.bitmapOffsetX = this.bitmapOffsetY = 0;
		this.textureWidth = this.textureHeight = 0;
		this.sourceWidth = this.sourceHeight = 0;
	}
}
