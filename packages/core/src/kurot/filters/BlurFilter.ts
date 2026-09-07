import { Filter } from './Filter.js';

export class BlurFilter extends Filter {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _blurX: number;
	private _blurY: number;
	private _quality: number;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(blurX = 4, blurY = 4, quality = 1) {
		super();
		this.type = 'blur';
		this._blurX = validateRadius(blurX);
		this._blurY = validateRadius(blurY);
		this._quality = validateQuality(quality);
		this.uniforms = { blurX, blurY };
		this.onPropertyChange();
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get blurX(): number {
		return this._blurX;
	}
	public set blurX(value: number) {
		validateRadius(value);
		if (this._blurX === value) return;
		this._blurX = value;
		(this.uniforms as Record<string, number>).blurX = value;
		this.onPropertyChange();
	}

	public get blurY(): number {
		return this._blurY;
	}
	public set blurY(value: number) {
		validateRadius(value);
		if (this._blurY === value) return;
		this._blurY = value;
		(this.uniforms as Record<string, number>).blurY = value;
		this.onPropertyChange();
	}

	/**
	 * Number of horizontal/vertical pass pairs, from 1 to 16 (WebGL only).
	 * Each pair uses radius / sqrt(quality), preserving approximate blur variance.
	 */
	public get quality(): number {
		return this._quality;
	}
	public set quality(value: number) {
		this._quality = validateQuality(value);
		this.onPropertyChange();
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	protected override updatePadding(): void {
		this.paddingLeft = this.paddingRight = Math.ceil(this._blurX * Math.sqrt(this._quality));
		this.paddingTop = this.paddingBottom = Math.ceil(this._blurY * Math.sqrt(this._quality));
	}

	override toJson(): string {
		return `{"blurX":${this._blurX},"blurY":${this._blurY},"quality":${this._quality}}`;
	}
}

function validateRadius(value: number): number {
	if (!Number.isFinite(value) || value < 0) throw new RangeError('Blur radius must be finite and non-negative.');
	return value;
}

function validateQuality(value: number): number {
	if (!Number.isInteger(value) || value < 1 || value > 16) throw new RangeError('Blur quality must be an integer from 1 to 16.');
	return value;
}
