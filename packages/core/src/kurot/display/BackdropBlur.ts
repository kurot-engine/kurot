import { BlurFilter } from '../filters/BlurFilter.js';
import type { Rectangle } from '../geom/Rectangle.js';
import { DisplayObject, RenderObjectType } from './DisplayObject.js';

/**
 * Local logical dimensions and the same blur controls as BlurFilter.
 */
export interface BackdropBlurOptions {
	/**
	 * Local logical width, initially zero. Finite and non-negative.
	 */
	width?: number;
	/**
	 * Local logical height, initially zero. Finite and non-negative.
	 */
	height?: number;
	/**
	 * Horizontal local blur radius, initially 4, matching BlurFilter.
	 */
	blurX?: number;
	/**
	 * Vertical local blur radius, initially 4, matching BlurFilter.
	 */
	blurY?: number;
	/**
	 * GPU horizontal/vertical pass pairs, 1–16; initially 1. Canvas approximates blur.
	 */
	quality?: number;
	/**
	 * Optional raster pixels per local unit, capped by the transformed target
	 * resolution. Undefined inherits it. A lower value reduces work and detail.
	 */
	resolution?: number;
}

/**
 * Blurs previously drawn pixels in the current compositing layer. Later siblings
 * stay sharp. Alpha mixes the original and blurred premultiplied pixels; input
 * blocking and game suspension remain the application's responsibility.
 *
 * ```ts
 * import { BackdropBlur } from '@kurot/core';
 * import type { DisplayObjectContainer } from '@kurot/core';
 *
 * export function insertBackdrop(layer: DisplayObjectContainer, width: number, height: number): BackdropBlur {
 *     const backdrop = new BackdropBlur({ width, height, blurX: 36, blurY: 36, quality: 1, resolution: 0.5 });
 *     layer.addChildAt(backdrop, 0);
 *     return backdrop;
 * }
 * ```
 */
export class BackdropBlur extends DisplayObject {
	// ── Instance fields ───────────────────────────────────────────────────

	/**
	 * Owns blur parameters and invalidation only; rendering backends own buffers.
	 */
	private readonly _blur: BlurFilter;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(options: BackdropBlurOptions = {}) {
		super();
		this.$renderObjectType = RenderObjectType.BACKDROP_BLUR;
		this.touchEnabled = false;
		this._blur = new BlurFilter(options.blurX, options.blurY, options.quality);
		this._blur.resolution = options.resolution;
		this._blur.$attach(this);
		this.width = options.width ?? 0;
		this.height = options.height ?? 0;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	/**
	 * Finite non-negative local effect width. Resizing does not change scaleX.
	 */
	public override get width(): number {
		return this.$explicitWidth;
	}
	public override set width(value: number) {
		validateSize(value);
		if (this.$explicitWidth !== value) {
			this.$explicitWidth = value;
			this.invalidateGeometry();
		}
	}

	/**
	 * Finite non-negative local effect height. Resizing does not change scaleY.
	 */
	public override get height(): number {
		return this.$explicitHeight;
	}
	public override set height(value: number) {
		validateSize(value);
		if (this.$explicitHeight !== value) {
			this.$explicitHeight = value;
			this.invalidateGeometry();
		}
	}

	/**
	 * Horizontal blur radius in local logical units; zero disables this axis.
	 */
	public get blurX(): number {
		return this._blur.blurX;
	}
	public set blurX(value: number) {
		this._blur.blurX = value;
	}

	/**
	 * Vertical blur radius in local logical units; zero disables this axis.
	 */
	public get blurY(): number {
		return this._blur.blurY;
	}
	public set blurY(value: number) {
		this._blur.blurY = value;
	}

	/**
	 * Number of GPU pass pairs, from 1 to 16. Canvas uses a CSS approximation.
	 */
	public get quality(): number {
		return this._blur.quality;
	}
	public set quality(value: number) {
		this._blur.quality = value;
	}

	/**
	 * Optional positive raster resolution cap in pixels per local logical unit.
	 */
	public get resolution(): number | undefined {
		return this._blur.resolution;
	}
	public set resolution(value: number | undefined) {
		this._blur.resolution = value;
	}

	// ── Overrides ─────────────────────────────────────────────────────────

	public override $measureContentBounds(bounds: Rectangle): void {
		bounds.setTo(0, 0, this.width, this.height);
	}

	public override $hitTest(stageX: number, stageY: number): DisplayObject | undefined {
		return this.touchEnabled ? super.$hitTest(stageX, stageY) : undefined;
	}

	// ── Internal methods ──────────────────────────────────────────────────

	/**
	 * Borrowed internal filter; not a second display-object filter stack.
	 */
	public $getBackdropFilter(): BlurFilter {
		return this._blur;
	}

	// ── Private methods ───────────────────────────────────────────────────

	private invalidateGeometry(): void {
		this.$markDirty();
		// Layout can measure an already-dirty ancestor before the next render.
		// A dimension change must invalidate those measured bounds as well.
		for (let parent = this.$parent; parent; parent = parent.$parent) {
			parent.$markDirty();
		}
	}
}

function validateSize(value: number): void {
	if (!Number.isFinite(value) || value < 0) {
		throw new RangeError('BackdropBlur dimensions must be finite and non-negative.');
	}
}
