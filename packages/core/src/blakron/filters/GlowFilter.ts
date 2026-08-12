import { Filter } from './Filter.js';

export class GlowFilter extends Filter {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _color: number;
	private _red: number;
	private _green: number;
	private _blue: number;
	private _alpha: number;
	private _blurX: number;
	private _blurY: number;
	private _strength: number;
	private _quality: number;
	private _inner: boolean;
	private _knockout: boolean;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(
		color = 0xff0000,
		alpha = 1,
		blurX = 6,
		blurY = 6,
		strength = 2,
		quality = 1,
		inner = false,
		knockout = false,
	) {
		super();
		this.type = 'glow';
		this._color = color;
		this._red = color >> 16;
		this._green = (color & 0x00ff00) >> 8;
		this._blue = color & 0x0000ff;
		this._alpha = alpha;
		this._blurX = blurX;
		this._blurY = blurY;
		this._strength = strength;
		this._quality = quality;
		this._inner = inner;
		this._knockout = knockout;
		this.uniforms = {
			color: { x: this._red / 255, y: this._green / 255, z: this._blue / 255, w: 1 },
			alpha,
			blurX,
			blurY,
			strength,
			inner: inner ? 1 : 0,
			knockout: knockout ? 0 : 1,
			dist: 0,
			angle: 0,
			hideObject: 0,
		};
		this.onPropertyChange();
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get color(): number {
		return this._color;
	}
	public set color(value: number) {
		if (this._color === value) return;
		this._color = value;
		this._red = value >> 16;
		this._green = (value & 0x00ff00) >> 8;
		this._blue = value & 0x0000ff;
		const c = this.uniforms.color as { x: number; y: number; z: number };
		c.x = this._red / 255;
		c.y = this._green / 255;
		c.z = this._blue / 255;
	}

	public get alpha(): number {
		return this._alpha;
	}
	public set alpha(value: number) {
		if (this._alpha === value) return;
		this._alpha = value;
		this.uniforms.alpha = value;
	}

	public get blurX(): number {
		return this._blurX;
	}
	public set blurX(value: number) {
		if (this._blurX === value) return;
		this._blurX = value;
		this.uniforms.blurX = value;
		this.onPropertyChange();
	}

	public get blurY(): number {
		return this._blurY;
	}
	public set blurY(value: number) {
		if (this._blurY === value) return;
		this._blurY = value;
		this.uniforms.blurY = value;
		this.onPropertyChange();
	}

	public get strength(): number {
		return this._strength;
	}
	public set strength(value: number) {
		if (this._strength === value) return;
		this._strength = value;
		this.uniforms.strength = value;
	}

	public get quality(): number {
		return this._quality;
	}
	public set quality(value: number) {
		this._quality = value;
	}

	public get inner(): boolean {
		return this._inner;
	}
	public set inner(value: boolean) {
		if (this._inner === value) return;
		this._inner = value;
		this.uniforms.inner = value ? 1 : 0;
	}

	public get knockout(): boolean {
		return this._knockout;
	}
	public set knockout(value: boolean) {
		if (this._knockout === value) return;
		this._knockout = value;
		this.uniforms.knockout = value ? 0 : 1;
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	protected override updatePadding(): void {
		this.paddingLeft = this.paddingRight = this._blurX;
		this.paddingTop = this.paddingBottom = this._blurY;
	}

	override toJson(): string {
		return `{"color":${this._color},"red":${this._red},"green":${this._green},"blue":${this._blue},"alpha":${this._alpha},"blurX":${this._blurX},"blurY":${this._blurY},"strength":${this._strength},"quality":${this._quality},"inner":${this._inner},"knockout":${this._knockout}}`;
	}
}
