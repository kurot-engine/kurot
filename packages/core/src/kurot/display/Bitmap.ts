import { Rectangle } from '../geom/Rectangle.js';
import { DisplayObject, RenderObjectType } from './DisplayObject.js';
import { BitmapData } from './texture/BitmapData.js';
import { Texture } from './texture/Texture.js';
import { BitmapFillMode } from './enums/BitmapFillMode.js';
import type { Stage } from './Stage.js';

/** @internal Injected by CanvasRenderer to avoid circular dependency. */
export let bitmapPixelHitTest: ((bitmap: Bitmap, localX: number, localY: number) => boolean) | undefined;

export function setBitmapPixelHitTest(fn: (bitmap: Bitmap, localX: number, localY: number) => boolean): void {
	bitmapPixelHitTest = fn;
}

export class Bitmap extends DisplayObject {
	// ── Static fields ─────────────────────────────────────────────────────────

	public static defaultSmoothing = true;

	// ── Instance fields ───────────────────────────────────────────────────────

	private _texture?: Texture;
	private _smoothing: boolean = Bitmap.defaultSmoothing;
	private _fillMode: BitmapFillMode = BitmapFillMode.SCALE;
	private _scale9Grid?: Rectangle;
	private _pixelHitTest = false;
	private _explicitBitmapWidth = NaN;
	private _explicitBitmapHeight = NaN;

	// Cached texture region data (updated when texture changes)
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

	public get texture(): Texture | undefined {
		return this._texture;
	}
	public set texture(value: Texture | undefined) {
		this.setTexture(value);
	}

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

	public get scale9Grid(): Rectangle | undefined {
		return this._scale9Grid;
	}
	public set scale9Grid(value: Rectangle | undefined) {
		this._scale9Grid = value;
		this.$renderDirty = true;
		this.$markDirty();
	}

	public get pixelHitTest(): boolean {
		return this._pixelHitTest;
	}
	public set pixelHitTest(value: boolean) {
		this._pixelHitTest = !!value;
	}

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
			// When already on stage, update BitmapData reference counting.
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
