import { Filter } from './Filter.js';

const IDENTITY: number[] = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

export class ColorMatrixFilter extends Filter {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _matrix: number[] = [...IDENTITY];

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(matrix?: number[]) {
		super();
		this.type = 'colorTransform';
		this.uniforms = {
			matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
			colorAdd: { x: 0, y: 0, z: 0, w: 0 },
		};
		this.$setMatrix(matrix);
		this.onPropertyChange();
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get matrix(): number[] {
		return [...this._matrix];
	}
	public set matrix(value: number[]) {
		this.$setMatrix(value);
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	override toJson(): string {
		return `{"matrix":[${this._matrix}]}`;
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private $setMatrix(value?: number[]): void {
		const src = value ?? IDENTITY;
		for (let i = 0; i < 20; i++) this._matrix[i] = src[i] ?? 0;

		const matrix = this.uniforms.matrix as number[];
		const colorAdd = this.uniforms.colorAdd as { x: number; y: number; z: number; w: number };
		let j = 0;
		for (let i = 0; i < 20; i++) {
			if (i === 4) colorAdd.x = this._matrix[i] / 255;
			else if (i === 9) colorAdd.y = this._matrix[i] / 255;
			else if (i === 14) colorAdd.z = this._matrix[i] / 255;
			else if (i === 19) colorAdd.w = this._matrix[i] / 255;
			else matrix[j++] = this._matrix[i];
		}
		this.onPropertyChange();
	}
}
