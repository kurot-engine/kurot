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
		this._blurX = blurX;
		this._blurY = blurY;
		this._quality = quality;
		this.uniforms = { blurX, blurY };
		this.onPropertyChange();
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get blurX(): number {
		return this._blurX;
	}
	public set blurX(value: number) {
		if (this._blurX === value) return;
		this._blurX = value;
		(this.uniforms as Record<string, number>).blurX = value;
		this.onPropertyChange();
	}

	public get blurY(): number {
		return this._blurY;
	}
	public set blurY(value: number) {
		if (this._blurY === value) return;
		this._blurY = value;
		(this.uniforms as Record<string, number>).blurY = value;
		this.onPropertyChange();
	}

	public get quality(): number {
		return this._quality;
	}
	public set quality(value: number) {
		this._quality = value;
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	protected override updatePadding(): void {
		this.paddingLeft = this.paddingRight = this._blurX;
		this.paddingTop = this.paddingBottom = this._blurY;
	}

	override toJson(): string {
		return `{"blurX":${this._blurX},"blurY":${this._blurY},"quality":${this._quality}}`;
	}
}
