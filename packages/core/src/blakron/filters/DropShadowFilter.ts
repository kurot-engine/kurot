import { NumberUtils } from '../utils/NumberUtils.js';
import { GlowFilter } from './GlowFilter.js';

export class DropShadowFilter extends GlowFilter {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _distance: number;
	private _angle: number;
	private _hideObject: boolean;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(
		distance = 4,
		angle = 45,
		color = 0,
		alpha = 1,
		blurX = 4,
		blurY = 4,
		strength = 1,
		quality = 1,
		inner = false,
		knockout = false,
		hideObject = false,
	) {
		super(color, alpha, blurX, blurY, strength, quality, inner, knockout);
		this._distance = distance;
		this._angle = angle;
		this._hideObject = hideObject;
		this.uniforms.dist = distance;
		this.uniforms.angle = (angle / 180) * Math.PI;
		this.uniforms.hideObject = hideObject ? 1 : 0;
		this.onPropertyChange();
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get distance(): number {
		return this._distance;
	}
	public set distance(value: number) {
		if (this._distance === value) return;
		this._distance = value;
		this.uniforms.dist = value;
		this.onPropertyChange();
	}

	public get angle(): number {
		return this._angle;
	}
	public set angle(value: number) {
		if (this._angle === value) return;
		this._angle = value;
		this.uniforms.angle = (value / 180) * Math.PI;
		this.onPropertyChange();
	}

	public get hideObject(): boolean {
		return this._hideObject;
	}
	public set hideObject(value: boolean) {
		if (this._hideObject === value) return;
		this._hideObject = value;
		this.uniforms.hideObject = value ? 1 : 0;
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	protected override updatePadding(): void {
		this.paddingLeft = this.paddingRight = this.blurX;
		this.paddingTop = this.paddingBottom = this.blurY;
		if (this._distance !== 0) {
			const dx = this._distance * NumberUtils.cos(this._angle);
			const dy = this._distance * NumberUtils.sin(this._angle);
			// Shadow offset goes right/down → expand right/bottom padding.
			// Shadow offset goes left/up → expand left/top padding.
			if (dx > 0) {
				this.paddingRight += Math.ceil(dx);
			} else {
				this.paddingLeft += Math.ceil(-dx);
			}
			if (dy > 0) {
				this.paddingBottom += Math.ceil(dy);
			} else {
				this.paddingTop += Math.ceil(-dy);
			}
		}
	}

	override toJson(): string {
		return `{"distance":${this._distance},"angle":${this._angle},"color":${this.color},"alpha":${this.alpha},"blurX":${this.blurX},"blurY":${this.blurY},"strength":${this.strength},"quality":${this.quality},"inner":${this.inner},"knockout":${this.knockout},"hideObject":${this._hideObject}}`;
	}
}
