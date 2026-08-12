import { NumberUtils } from '../utils/NumberUtils.js';
import { Point } from './Point.js';
import { Rectangle } from './Rectangle.js';

const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;
const matrixPool: Matrix[] = [];

export class Matrix {
	// ── Static methods ────────────────────────────────────────────────────────

	public static create(): Matrix {
		return matrixPool.pop() ?? new Matrix();
	}

	public static release(matrix: Matrix): void {
		matrixPool.push(matrix);
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	public a: number;
	public b: number;
	public c: number;
	public d: number;
	public tx: number;
	public ty: number;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.tx = tx;
		this.ty = ty;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public clone(): Matrix {
		return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty);
	}

	public copyFrom(other: Matrix): Matrix {
		this.a = other.a;
		this.b = other.b;
		this.c = other.c;
		this.d = other.d;
		this.tx = other.tx;
		this.ty = other.ty;
		return this;
	}

	public setTo(a: number, b: number, c: number, d: number, tx: number, ty: number): Matrix {
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.tx = tx;
		this.ty = ty;
		return this;
	}

	public identity(): void {
		this.a = this.d = 1;
		this.b = this.c = this.tx = this.ty = 0;
	}

	public invert(): void {
		this.invertInto(this);
	}

	public concat(other: Matrix): void {
		let a = this.a * other.a;
		let b = 0;
		let c = 0;
		let d = this.d * other.d;
		let tx = this.tx * other.a + other.tx;
		let ty = this.ty * other.d + other.ty;
		if (this.b !== 0 || this.c !== 0 || other.b !== 0 || other.c !== 0) {
			a += this.b * other.c;
			d += this.c * other.b;
			b += this.a * other.b + this.b * other.d;
			c += this.c * other.a + this.d * other.c;
			tx += this.ty * other.c;
			ty += this.tx * other.b;
		}
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.tx = tx;
		this.ty = ty;
	}

	public prepend(a: number, b: number, c: number, d: number, tx: number, ty: number): Matrix {
		const tx1 = this.tx;
		if (a !== 1 || b !== 0 || c !== 0 || d !== 1) {
			const a1 = this.a,
				c1 = this.c;
			this.a = a1 * a + this.b * c;
			this.b = a1 * b + this.b * d;
			this.c = c1 * a + this.d * c;
			this.d = c1 * b + this.d * d;
		}
		this.tx = tx1 * a + this.ty * c + tx;
		this.ty = tx1 * b + this.ty * d + ty;
		return this;
	}

	public append(a: number, b: number, c: number, d: number, tx: number, ty: number): Matrix {
		const a1 = this.a,
			b1 = this.b,
			c1 = this.c,
			d1 = this.d;
		if (a !== 1 || b !== 0 || c !== 0 || d !== 1) {
			this.a = a * a1 + b * c1;
			this.b = a * b1 + b * d1;
			this.c = c * a1 + d * c1;
			this.d = c * b1 + d * d1;
		}
		this.tx = tx * a1 + ty * c1 + this.tx;
		this.ty = tx * b1 + ty * d1 + this.ty;
		return this;
	}

	public rotate(angle: number): void {
		if (angle !== 0) {
			const deg = angle / DEG_TO_RAD;
			const u = NumberUtils.cos(deg);
			const v = NumberUtils.sin(deg);
			const { a, b, c, d, tx, ty } = this;
			this.a = a * u - b * v;
			this.b = a * v + b * u;
			this.c = c * u - d * v;
			this.d = c * v + d * u;
			this.tx = tx * u - ty * v;
			this.ty = tx * v + ty * u;
		}
	}

	public scale(sx: number, sy: number): void {
		if (sx !== 1) {
			this.a *= sx;
			this.c *= sx;
			this.tx *= sx;
		}
		if (sy !== 1) {
			this.b *= sy;
			this.d *= sy;
			this.ty *= sy;
		}
	}

	public translate(dx: number, dy: number): void {
		this.tx += dx;
		this.ty += dy;
	}

	public transformPoint(pointX: number, pointY: number, resultPoint?: Point): Point {
		const x = this.a * pointX + this.c * pointY + this.tx;
		const y = this.b * pointX + this.d * pointY + this.ty;
		if (resultPoint) {
			resultPoint.setTo(x, y);
			return resultPoint;
		}
		return new Point(x, y);
	}

	public deltaTransformPoint(point: Point): Point {
		return new Point(this.a * point.x + this.c * point.y, this.b * point.x + this.d * point.y);
	}

	public createBox(scaleX: number, scaleY: number, rotation = 0, tx = 0, ty = 0): void {
		if (rotation !== 0) {
			const deg = rotation / DEG_TO_RAD;
			const u = NumberUtils.cos(deg);
			const v = NumberUtils.sin(deg);
			this.a = u * scaleX;
			this.b = v * scaleY;
			this.c = -v * scaleX;
			this.d = u * scaleY;
		} else {
			this.a = scaleX;
			this.b = 0;
			this.c = 0;
			this.d = scaleY;
		}
		this.tx = tx;
		this.ty = ty;
	}

	public createGradientBox(width: number, height: number, rotation = 0, tx = 0, ty = 0): void {
		this.createBox(width / 1638.4, height / 1638.4, rotation, tx + width / 2, ty + height / 2);
	}

	public equals(other: Matrix): boolean {
		return (
			this.a === other.a &&
			this.b === other.b &&
			this.c === other.c &&
			this.d === other.d &&
			this.tx === other.tx &&
			this.ty === other.ty
		);
	}

	public toString(): string {
		return `(a=${this.a}, b=${this.b}, c=${this.c}, d=${this.d}, tx=${this.tx}, ty=${this.ty})`;
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	/** @internal */
	invertInto(target: Matrix): void {
		const { a, b, c, d, tx, ty } = this;
		if (b === 0 && c === 0) {
			target.b = target.c = 0;
			if (a === 0 || d === 0) {
				target.a = target.d = target.tx = target.ty = 0;
			} else {
				const ia = (target.a = 1 / a);
				const id = (target.d = 1 / d);
				target.tx = -ia * tx;
				target.ty = -id * ty;
			}
			return;
		}
		let det = a * d - b * c;
		if (det === 0) {
			target.identity();
			return;
		}
		det = 1 / det;
		const k = (target.a = d * det);
		const nb = (target.b = -b * det);
		const nc = (target.c = -c * det);
		const nd = (target.d = a * det);
		target.tx = -(k * tx + nc * ty);
		target.ty = -(nb * tx + nd * ty);
	}

	/** @internal */
	transformBounds(bounds: Rectangle): void {
		const { a, b, c, d, tx, ty } = this;
		const x = bounds.x,
			y = bounds.y;
		const xMax = x + bounds.width,
			yMax = y + bounds.height;
		let x0 = a * x + c * y + tx,
			y0 = b * x + d * y + ty;
		let x1 = a * xMax + c * y + tx,
			y1 = b * xMax + d * y + ty;
		let x2 = a * xMax + c * yMax + tx,
			y2 = b * xMax + d * yMax + ty;
		let x3 = a * x + c * yMax + tx,
			y3 = b * x + d * yMax + ty;
		let tmp: number;
		if (x0 > x1) {
			tmp = x0;
			x0 = x1;
			x1 = tmp;
		}
		if (x2 > x3) {
			tmp = x2;
			x2 = x3;
			x3 = tmp;
		}
		bounds.x = Math.floor(x0 < x2 ? x0 : x2);
		bounds.width = Math.ceil((x1 > x3 ? x1 : x3) - bounds.x);
		if (y0 > y1) {
			tmp = y0;
			y0 = y1;
			y1 = tmp;
		}
		if (y2 > y3) {
			tmp = y2;
			y2 = y3;
			y3 = tmp;
		}
		bounds.y = Math.floor(y0 < y2 ? y0 : y2);
		bounds.height = Math.ceil((y1 > y3 ? y1 : y3) - bounds.y);
	}

	/** @internal */
	getScaleX(): number {
		if (this.b === 0) return this.a;
		const result = Math.sqrt(this.a * this.a + this.b * this.b);
		return this.getDeterminant() < 0 ? -result : result;
	}

	/** @internal */
	getScaleY(): number {
		if (this.c === 0) return this.d;
		const result = Math.sqrt(this.c * this.c + this.d * this.d);
		return this.getDeterminant() < 0 ? -result : result;
	}

	/** @internal */
	getSkewX(): number {
		return this.d < 0 ? Math.atan2(this.d, this.c) + Math.PI / 2 : Math.atan2(this.d, this.c) - Math.PI / 2;
	}

	/** @internal */
	getSkewY(): number {
		return this.a < 0 ? Math.atan2(this.b, this.a) - Math.PI : Math.atan2(this.b, this.a);
	}

	/** @internal */
	updateScaleAndRotation(scaleX: number, scaleY: number, skewX: number, skewY: number): void {
		if ((skewX === 0 || skewX === TWO_PI) && (skewY === 0 || skewY === TWO_PI)) {
			this.a = scaleX;
			this.b = this.c = 0;
			this.d = scaleY;
			return;
		}
		const sx = skewX / DEG_TO_RAD,
			sy = skewY / DEG_TO_RAD;
		const u = NumberUtils.cos(sx),
			v = NumberUtils.sin(sx);
		this.a = skewX === skewY ? u * scaleX : NumberUtils.cos(sy) * scaleX;
		this.b = skewX === skewY ? v * scaleX : NumberUtils.sin(sy) * scaleX;
		this.c = -v * scaleY;
		this.d = u * scaleY;
	}

	/** @internal target = other * this */
	preMultiplyInto(other: Matrix, target: Matrix): void {
		let a = other.a * this.a,
			b = 0,
			c = 0,
			d = other.d * this.d;
		let tx = other.tx * this.a + this.tx;
		let ty = other.ty * this.d + this.ty;
		if (other.b !== 0 || other.c !== 0 || this.b !== 0 || this.c !== 0) {
			a += other.b * this.c;
			d += other.c * this.b;
			b += other.a * this.b + other.b * this.d;
			c += other.c * this.a + other.d * this.c;
			tx += other.ty * this.c;
			ty += other.tx * this.b;
		}
		target.a = a;
		target.b = b;
		target.c = c;
		target.d = d;
		target.tx = tx;
		target.ty = ty;
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private getDeterminant(): number {
		return this.a * this.d - this.b * this.c;
	}
}

/** @internal Reusable temp instance for framework internals — do not hold references. */
export const sharedMatrix: Matrix = new Matrix();
