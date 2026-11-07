import { BackdropBlur } from '@kurot/core';
import type { BackdropBlurOptions, DisplayObject, Rectangle } from '@kurot/core';
import { Component } from './Component.js';

/**
 * Layout-aware background blur, created in code without a Skin. Insert before
 * the modal mask and popup. Input passes through by default; game suspension
 * and input blocking remain application-owned. Rendering follows Core's
 * BackdropBlur isolation, cache restrictions and Canvas fallback.
 *
 * ```ts
 * import { Backdrop, UILayer } from '@kurot/ui';
 *
 * export function addBackdrop(layer: UILayer): Backdrop {
 *     const backdrop = new Backdrop({ blurX: 36, blurY: 36, resolution: 0.5 });
 *     backdrop.left = backdrop.right = backdrop.top = backdrop.bottom = 0;
 *     layer.addChildAt(backdrop, 0);
 *     return backdrop;
 * }
 * ```
 */
export class Backdrop extends Component {
	// ── Instance fields ───────────────────────────────────────────────────

	private readonly _effect: BackdropBlur;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(options: BackdropBlurOptions = {}) {
		super();
		this.touchEnabled = false;
		this.touchChildren = false;
		this._effect = new BackdropBlur(options);
		this.addChild(this._effect);
		if (options.width !== undefined) {
			this.width = options.width;
		}
		if (options.height !== undefined) {
			this.height = options.height;
		}
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	/**
	 * Horizontal blur radius in local logical units; initially 4, zero disables it.
	 */
	public get blurX(): number {
		return this._effect.blurX;
	}
	public set blurX(value: number) {
		this._effect.blurX = value;
	}

	/**
	 * Vertical blur radius in local logical units; initially 4, zero disables it.
	 */
	public get blurY(): number {
		return this._effect.blurY;
	}
	public set blurY(value: number) {
		this._effect.blurY = value;
	}

	/**
	 * GPU horizontal/vertical pass pairs, integer 1–16; initially 1.
	 */
	public get quality(): number {
		return this._effect.quality;
	}
	public set quality(value: number) {
		this._effect.quality = value;
	}

	/**
	 * Positive optional pixels-per-local-unit cap. Undefined inherits the target
	 * density. Lower values reduce work/detail without changing layout dimensions.
	 */
	public get resolution(): number | undefined {
		return this._effect.resolution;
	}
	public set resolution(value: number | undefined) {
		this._effect.resolution = value;
	}

	// ── Override methods ──────────────────────────────────────────────────

	/**
	 * This code-created visual does not resolve or apply a default theme Skin.
	 */
	public override createChildren(): void {}

	/**
	 * No intrinsic size: previous effect dimensions must not feed back into layout.
	 */
	public override measure(): void {
		this.setMeasuredSize(0, 0);
	}

	/**
	 * Synchronizes the sampled rectangle with the validated, unscaled UI frame.
	 */
	public override updateDisplayList(width: number, height: number): void {
		this._effect.width = width;
		this._effect.height = height;
	}

	public override $measureContentBounds(bounds: Rectangle): void {
		// The wrapper has no Graphics; its local frame supplies standard bounds
		// hit testing if the application explicitly enables input.
		this.ui.getActualBounds(bounds);
	}

	public override $hitTest(stageX: number, stageY: number): DisplayObject | undefined {
		// Returning no target prevents an ancestor container from treating this
		// noninteractive visual's bounds as an input-blocking descendant.
		if (!this.touchEnabled) {
			return undefined;
		}
		return super.$hitTest(stageX, stageY);
	}
}
