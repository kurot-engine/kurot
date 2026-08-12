import { Point } from './Point.js';

const rectanglePool: Rectangle[] = [];

export class Rectangle {
	// ── Static methods ────────────────────────────────────────────────────────

	public static create(): Rectangle {
		return rectanglePool.pop() ?? new Rectangle();
	}

	public static release(rect: Rectangle): void {
		rectanglePool.push(rect);
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	public x: number;
	public y: number;
	public width: number;
	public height: number;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(x = 0, y = 0, width = 0, height = 0) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get right(): number {
		return this.x + this.width;
	}
	public set right(value: number) {
		this.width = value - this.x;
	}

	public get bottom(): number {
		return this.y + this.height;
	}
	public set bottom(value: number) {
		this.height = value - this.y;
	}

	public get left(): number {
		return this.x;
	}
	public set left(value: number) {
		this.width += this.x - value;
		this.x = value;
	}

	public get top(): number {
		return this.y;
	}
	public set top(value: number) {
		this.height += this.y - value;
		this.y = value;
	}

	public get topLeft(): Point {
		return new Point(this.left, this.top);
	}
	public set topLeft(value: Point) {
		this.top = value.y;
		this.left = value.x;
	}

	public get bottomRight(): Point {
		return new Point(this.right, this.bottom);
	}
	public set bottomRight(value: Point) {
		this.bottom = value.y;
		this.right = value.x;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public setTo(x: number, y: number, width: number, height: number): Rectangle {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		return this;
	}

	public copyFrom(source: Rectangle): Rectangle {
		this.x = source.x;
		this.y = source.y;
		this.width = source.width;
		this.height = source.height;
		return this;
	}

	public clone(): Rectangle {
		return new Rectangle(this.x, this.y, this.width, this.height);
	}

	public isEmpty(): boolean {
		return this.width <= 0 || this.height <= 0;
	}

	public setEmpty(): void {
		this.x = this.y = this.width = this.height = 0;
	}

	public contains(x: number, y: number): boolean {
		return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
	}

	public containsPoint(point: Point): boolean {
		return this.contains(point.x, point.y);
	}

	public containsRect(rect: Rectangle): boolean {
		const r1 = rect.x + rect.width;
		const b1 = rect.y + rect.height;
		const r2 = this.x + this.width;
		const b2 = this.y + this.height;
		return (
			rect.x >= this.x &&
			rect.x < r2 &&
			rect.y >= this.y &&
			rect.y < b2 &&
			r1 > this.x &&
			r1 <= r2 &&
			b1 > this.y &&
			b1 <= b2
		);
	}

	public intersects(toIntersect: Rectangle): boolean {
		return (
			Math.max(this.x, toIntersect.x) <= Math.min(this.right, toIntersect.right) &&
			Math.max(this.y, toIntersect.y) <= Math.min(this.bottom, toIntersect.bottom)
		);
	}

	public intersection(toIntersect: Rectangle): Rectangle {
		return this.clone().intersectInPlace(toIntersect);
	}

	public union(toUnion: Rectangle): Rectangle {
		const result = this.clone();
		if (toUnion.isEmpty()) return result;
		if (result.isEmpty()) return result.copyFrom(toUnion);
		const l = Math.min(result.x, toUnion.x);
		const t = Math.min(result.y, toUnion.y);
		return result.setTo(
			l,
			t,
			Math.max(result.right, toUnion.right) - l,
			Math.max(result.bottom, toUnion.bottom) - t,
		);
	}

	public inflate(dx: number, dy: number): void {
		this.x -= dx;
		this.width += 2 * dx;
		this.y -= dy;
		this.height += 2 * dy;
	}

	public inflatePoint(point: Point): void {
		this.inflate(point.x, point.y);
	}

	public offset(dx: number, dy: number): void {
		this.x += dx;
		this.y += dy;
	}

	public offsetPoint(point: Point): void {
		this.offset(point.x, point.y);
	}

	public equals(toCompare: Rectangle): boolean {
		return (
			this === toCompare ||
			(this.x === toCompare.x &&
				this.y === toCompare.y &&
				this.width === toCompare.width &&
				this.height === toCompare.height)
		);
	}

	public toString(): string {
		return `(x=${this.x}, y=${this.y}, width=${this.width}, height=${this.height})`;
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	private intersectInPlace(clip: Rectangle): Rectangle {
		const l = Math.max(this.x, clip.x);
		const r = Math.min(this.right, clip.right);
		if (l <= r) {
			const t = Math.max(this.y, clip.y);
			const b = Math.min(this.bottom, clip.bottom);
			if (t <= b) return this.setTo(l, t, r - l, b - t);
		}
		return this.setTo(0, 0, 0, 0);
	}

	/** @internal */
	getBaseWidth(angle: number): number {
		return Math.abs(Math.cos(angle)) * this.width + Math.abs(Math.sin(angle)) * this.height;
	}

	/** @internal */
	getBaseHeight(angle: number): number {
		return Math.abs(Math.sin(angle)) * this.width + Math.abs(Math.cos(angle)) * this.height;
	}
}

/** @internal Reusable temp instance for framework internals — do not hold references. */
export const sharedRectangle: Rectangle = new Rectangle();
