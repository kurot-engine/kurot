import { NumberUtils } from '../utils/NumberUtils.js';

const pointPool: Point[] = [];

export class Point {
	// ── Static methods ────────────────────────────────────────────────────────

	public static create(x: number, y: number): Point {
		const point = pointPool.pop() ?? new Point();
		return point.setTo(x, y);
	}

	public static release(point: Point): void {
		pointPool.push(point);
	}

	public static distance(p1: Point, p2: Point): number {
		return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
	}

	public static interpolate(pt1: Point, pt2: Point, f: number): Point {
		const f1 = 1 - f;
		return new Point(pt1.x * f + pt2.x * f1, pt1.y * f + pt2.y * f1);
	}

	public static polar(len: number, angle: number): Point {
		return new Point(len * NumberUtils.cos(angle), len * NumberUtils.sin(angle));
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	public x: number;
	public y: number;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	// ── Getters ───────────────────────────────────────────────────────────────

	public get length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public setTo(x: number, y: number): Point {
		this.x = x;
		this.y = y;
		return this;
	}

	public clone(): Point {
		return new Point(this.x, this.y);
	}

	public copyFrom(source: Point): void {
		this.x = source.x;
		this.y = source.y;
	}

	public equals(toCompare: Point): boolean {
		return this.x === toCompare.x && this.y === toCompare.y;
	}

	public add(v: Point): Point {
		return new Point(this.x + v.x, this.y + v.y);
	}

	public subtract(v: Point): Point {
		return new Point(this.x - v.x, this.y - v.y);
	}

	public offset(dx: number, dy: number): void {
		this.x += dx;
		this.y += dy;
	}

	public normalize(thickness: number): void {
		if (this.x !== 0 || this.y !== 0) {
			const scale = thickness / this.length;
			this.x *= scale;
			this.y *= scale;
		}
	}

	public toString(): string {
		return `(x=${this.x}, y=${this.y})`;
	}
}

/** @internal Reusable temp instance for framework internals — do not hold references. */
export const sharedPoint: Point = new Point();
