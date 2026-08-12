import { describe, it, expect } from 'vitest';
import { Rectangle, sharedRectangle } from '../src/blakron/geom/Rectangle.js';
import { Point } from '../src/blakron/geom/Point.js';

describe('Rectangle', () => {
	it('defaults to (0,0,0,0)', () => {
		const r = new Rectangle();
		expect(r.x).toBe(0);
		expect(r.y).toBe(0);
		expect(r.width).toBe(0);
		expect(r.height).toBe(0);
	});

	it('constructor accepts x, y, w, h', () => {
		const r = new Rectangle(1, 2, 3, 4);
		expect(r.x).toBe(1);
		expect(r.y).toBe(2);
		expect(r.width).toBe(3);
		expect(r.height).toBe(4);
	});

	it('setTo updates all fields', () => {
		const r = new Rectangle();
		r.setTo(10, 20, 30, 40);
		expect(r.x).toBe(10);
		expect(r.width).toBe(30);
	});

	it('copyFrom deep copies', () => {
		const a = new Rectangle(1, 2, 3, 4);
		const b = new Rectangle();
		b.copyFrom(a);
		expect(b.equals(a)).toBe(true);
		a.x = 99;
		expect(b.x).toBe(1);
	});

	it('clone returns new equal instance', () => {
		const r = new Rectangle(1, 2, 3, 4);
		const c = r.clone();
		expect(c).not.toBe(r);
		expect(c.equals(r)).toBe(true);
	});

	it('right/bottom getters', () => {
		const r = new Rectangle(10, 20, 30, 40);
		expect(r.right).toBe(40);
		expect(r.bottom).toBe(60);
	});

	it('right/bottom setters', () => {
		const r = new Rectangle(10, 20, 30, 40);
		r.right = 50;
		expect(r.width).toBe(40);
		r.bottom = 100;
		expect(r.height).toBe(80);
	});

	it('topLeft/bottomRight getters', () => {
		const r = new Rectangle(1, 2, 3, 4);
		const tl = r.topLeft;
		expect(tl.x).toBe(1);
		expect(tl.y).toBe(2);
		const br = r.bottomRight;
		expect(br.x).toBe(4);
		expect(br.y).toBe(6);
	});

	it('contains point inside', () => {
		const r = new Rectangle(0, 0, 100, 100);
		expect(r.contains(50, 50)).toBe(true);
	});

	it('contains point on edge', () => {
		const r = new Rectangle(0, 0, 100, 100);
		expect(r.contains(0, 0)).toBe(true);
		expect(r.contains(100, 100)).toBe(true);
	});

	it('does not contain point outside', () => {
		const r = new Rectangle(0, 0, 100, 100);
		expect(r.contains(-1, 50)).toBe(false);
		expect(r.contains(101, 50)).toBe(false);
	});

	it('containsPoint delegates to contains', () => {
		const r = new Rectangle(0, 0, 10, 10);
		expect(r.containsPoint(new Point(5, 5))).toBe(true);
		expect(r.containsPoint(new Point(11, 5))).toBe(false);
	});

	it('containsRect fully contained', () => {
		const outer = new Rectangle(0, 0, 100, 100);
		const inner = new Rectangle(10, 10, 20, 20);
		expect(outer.containsRect(inner)).toBe(true);
	});

	it('containsRect partial overlap returns false', () => {
		const a = new Rectangle(0, 0, 50, 50);
		const b = new Rectangle(25, 25, 50, 50);
		expect(a.containsRect(b)).toBe(false);
	});

	it('intersects detects overlap', () => {
		const a = new Rectangle(0, 0, 50, 50);
		const b = new Rectangle(25, 25, 50, 50);
		expect(a.intersects(b)).toBe(true);
	});

	it('intersects returns false for non-overlapping', () => {
		const a = new Rectangle(0, 0, 10, 10);
		const b = new Rectangle(20, 20, 10, 10);
		expect(a.intersects(b)).toBe(false);
	});

	it('intersection returns overlap rect', () => {
		const a = new Rectangle(0, 0, 50, 50);
		const b = new Rectangle(25, 25, 50, 50);
		const i = a.intersection(b);
		expect(i.x).toBe(25);
		expect(i.y).toBe(25);
		expect(i.width).toBe(25);
		expect(i.height).toBe(25);
	});

	it('intersection returns empty for non-overlapping', () => {
		const a = new Rectangle(0, 0, 10, 10);
		const b = new Rectangle(20, 20, 10, 10);
		const i = a.intersection(b);
		expect(i.isEmpty()).toBe(true);
	});

	it('union merges two rects', () => {
		const a = new Rectangle(0, 0, 10, 10);
		const b = new Rectangle(5, 5, 10, 10);
		const u = a.union(b);
		expect(u.x).toBe(0);
		expect(u.y).toBe(0);
		expect(u.width).toBe(15);
		expect(u.height).toBe(15);
	});

	it('inflate expands symmetrically', () => {
		const r = new Rectangle(10, 10, 20, 20);
		r.inflate(5, 5);
		expect(r.x).toBe(5);
		expect(r.y).toBe(5);
		expect(r.width).toBe(30);
		expect(r.height).toBe(30);
	});

	it('isEmpty for zero/negative dimensions', () => {
		expect(new Rectangle(0, 0, 0, 10).isEmpty()).toBe(true);
		expect(new Rectangle(0, 0, 10, -1).isEmpty()).toBe(true);
		expect(new Rectangle(0, 0, 10, 10).isEmpty()).toBe(false);
	});

	it('setEmpty resets to (0,0,0,0)', () => {
		const r = new Rectangle(1, 2, 3, 4);
		r.setEmpty();
		expect(r.x).toBe(0);
		expect(r.width).toBe(0);
	});

	it('equals compares values', () => {
		const a = new Rectangle(1, 2, 3, 4);
		const b = new Rectangle(1, 2, 3, 4);
		expect(a.equals(b)).toBe(true);
		b.x = 99;
		expect(a.equals(b)).toBe(false);
	});

	it('equals same reference', () => {
		const a = new Rectangle(1, 2, 3, 4);
		expect(a.equals(a)).toBe(true);
	});

	it('offset shifts position', () => {
		const r = new Rectangle(10, 20, 30, 40);
		r.offset(5, 10);
		expect(r.x).toBe(15);
		expect(r.y).toBe(30);
		expect(r.width).toBe(30); // unchanged
	});

	it('object pool create/release', () => {
		const r = Rectangle.create();
		Rectangle.release(r);
		const r2 = Rectangle.create();
		expect(r2).toBe(r);
	});

	it('object pool LIFO ordering', () => {
		const r1 = Rectangle.create();
		const r2 = Rectangle.create();
		Rectangle.release(r2);
		Rectangle.release(r1);
		expect(Rectangle.create()).toBe(r1);
		expect(Rectangle.create()).toBe(r2);
	});

	// ── left/top getters/setters ───────────────────────────────────────

	it('left getter returns x', () => {
		const r = new Rectangle(10, 20, 30, 40);
		expect(r.left).toBe(10);
	});

	it('left setter adjusts x and width', () => {
		const r = new Rectangle(10, 20, 30, 40);
		r.left = 5;
		expect(r.x).toBe(5);
		expect(r.width).toBe(35);
	});

	it('top getter returns y', () => {
		const r = new Rectangle(10, 20, 30, 40);
		expect(r.top).toBe(20);
	});

	it('top setter adjusts y and height', () => {
		const r = new Rectangle(10, 20, 30, 40);
		r.top = 10;
		expect(r.y).toBe(10);
		expect(r.height).toBe(50);
	});

	it('topLeft setter', () => {
		const r = new Rectangle(10, 20, 30, 40);
		r.topLeft = new Point(5, 8);
		expect(r.x).toBe(5);
		expect(r.y).toBe(8);
		expect(r.width).toBe(35);
		expect(r.height).toBe(52);
	});

	it('bottomRight setter', () => {
		const r = new Rectangle(10, 20, 30, 40);
		r.bottomRight = new Point(50, 70);
		expect(r.width).toBe(40);
		expect(r.height).toBe(50);
	});

	// ── containsRect edge cases ─────────────────────────────────────────

	it('containsRect identical rectangles', () => {
		const r = new Rectangle(0, 0, 100, 100);
		expect(r.containsRect(r.clone())).toBe(true);
	});

	it('containsRect zero-dimension rect', () => {
		const r = new Rectangle(10, 10, 10, 10);
		const zero = new Rectangle(10, 10, 0, 0);
		expect(r.containsRect(zero)).toBe(false);
	});

	it('containsRect rect just touching edges', () => {
		const outer = new Rectangle(0, 0, 100, 100);
		// inner must be strictly inside (x > this.x, r1 > this.x)
		const inner = new Rectangle(0, 0, 100, 100);
		expect(outer.containsRect(inner)).toBe(true);
	});

	// ── intersection/union edge cases ───────────────────────────────────

	it('intersection with self returns self', () => {
		const r = new Rectangle(10, 20, 30, 40);
		const i = r.intersection(r);
		expect(i.equals(r)).toBe(true);
	});

	it('union with empty rect returns self', () => {
		const r = new Rectangle(10, 20, 30, 40);
		const empty = new Rectangle(0, 0, 0, 0);
		const u = r.union(empty);
		expect(u.equals(r)).toBe(true);
	});

	it('union with self returns self', () => {
		const r = new Rectangle(10, 20, 30, 40);
		const u = r.union(r);
		expect(u.equals(r)).toBe(true);
	});

	it('union when one rect is empty and target is not', () => {
		const empty = new Rectangle(0, 0, 0, 0);
		const r = new Rectangle(10, 20, 30, 40);
		const u = empty.union(r);
		expect(u.equals(r)).toBe(true);
	});

	// ── intersects edge cases ───────────────────────────────────────────

	it('intersects touching edges (no overlap)', () => {
		const a = new Rectangle(0, 0, 10, 10);
		const b = new Rectangle(10, 0, 10, 10);
		expect(a.intersects(b)).toBe(true); // touching counts as intersection
	});

	it('intersects shared border', () => {
		const a = new Rectangle(0, 0, 10, 10);
		const b = new Rectangle(0, 10, 10, 10);
		expect(a.intersects(b)).toBe(true);
	});

	// ── inflatePoint / offsetPoint ──────────────────────────────────────

	it('inflatePoint delegates to inflate', () => {
		const r = new Rectangle(10, 10, 20, 20);
		r.inflatePoint(new Point(5, 3));
		expect(r.x).toBe(5);
		expect(r.y).toBe(7);
		expect(r.width).toBe(30);
		expect(r.height).toBe(26);
	});

	it('offsetPoint delegates to offset', () => {
		const r = new Rectangle(10, 20, 30, 40);
		r.offsetPoint(new Point(5, 10));
		expect(r.x).toBe(15);
		expect(r.y).toBe(30);
	});

	// ── toString ────────────────────────────────────────────────────────

	it('toString returns formatted string', () => {
		const r = new Rectangle(1, 2, 3, 4);
		expect(r.toString()).toBe('(x=1, y=2, width=3, height=4)');
	});

	// ── getBaseWidth / getBaseHeight ────────────────────────────────────

	it('getBaseWidth with 0 angle equals width', () => {
		const r = new Rectangle(0, 0, 100, 50);
		expect(r['getBaseWidth'](0)).toBeCloseTo(100, 5);
	});

	it('getBaseWidth with 90° angle equals height', () => {
		const r = new Rectangle(0, 0, 100, 50);
		expect(r['getBaseWidth'](Math.PI / 2)).toBeCloseTo(50, 5);
	});

	it('getBaseHeight with 0 angle equals height', () => {
		const r = new Rectangle(0, 0, 100, 50);
		expect(r['getBaseHeight'](0)).toBeCloseTo(50, 5);
	});

	it('getBaseHeight with 90° angle equals width', () => {
		const r = new Rectangle(0, 0, 100, 50);
		expect(r['getBaseHeight'](Math.PI / 2)).toBeCloseTo(100, 5);
	});

	// ── sharedRectangle ─────────────────────────────────────────────────

	it('sharedRectangle is a mutable singleton', () => {
		sharedRectangle.setTo(10, 20, 30, 40);
		expect(sharedRectangle.x).toBe(10);
		expect(sharedRectangle.width).toBe(30);
		sharedRectangle.setEmpty();
	});

	// ── copyFrom chaining ───────────────────────────────────────────────

	it('copyFrom returns this', () => {
		const r = new Rectangle();
		expect(r.copyFrom(new Rectangle(1, 2, 3, 4))).toBe(r);
	});

	it('setTo returns this', () => {
		const r = new Rectangle();
		expect(r.setTo(1, 2, 3, 4)).toBe(r);
	});
});
