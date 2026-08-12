import { Matrix, NumberUtils } from '@blakron/core';

export class Particle {
	// ── Instance fields ───────────────────────────────────────────────────────

	public x = 0;
	public y = 0;
	public scale = 1;
	public rotation = 0;
	public alpha = 1;
	public currentTime = 0;
	public totalTime = 1000;
	public blendMode = 0;

	// ── Private fields ────────────────────────────────────────────────────────

	private _matrix: Matrix = new Matrix();

	// ── Public methods ────────────────────────────────────────────────────────

	public reset(): void {
		this.x = 0;
		this.y = 0;
		this.scale = 1;
		this.rotation = 0;
		this.alpha = 1;
		this.currentTime = 0;
		this.totalTime = 1000;
	}

	public $getMatrix(regX: number, regY: number): Matrix {
		const matrix = this._matrix;
		matrix.identity();

		let cos: number;
		let sin: number;
		if (this.rotation % 360) {
			cos = NumberUtils.cos(this.rotation);
			sin = NumberUtils.sin(this.rotation);
		} else {
			cos = 1;
			sin = 0;
		}

		matrix.append(cos * this.scale, sin * this.scale, -sin * this.scale, cos * this.scale, this.x, this.y);

		if (regX || regY) {
			matrix.tx -= regX * matrix.a + regY * matrix.c;
			matrix.ty -= regX * matrix.b + regY * matrix.d;
		}

		return matrix;
	}
}
