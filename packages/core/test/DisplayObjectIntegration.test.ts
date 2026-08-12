import { describe, it, expect } from 'vitest';
import { DisplayObject } from '../src/blakron/display/DisplayObject.js';
import { DisplayObjectContainer } from '../src/blakron/display/DisplayObjectContainer.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';
import { Point } from '../src/blakron/geom/Point.js';

/**
 * Integration tests for spatial methods:
 * - $hitTest / hitTestPoint
 * - getBounds / getTransformedBounds
 * - globalToLocal / localToGlobal
 * - $getConcatenatedMatrix / $getInvertedConcatenatedMatrix
 */

// A minimal "concrete" DisplayObject that declares content bounds via $measureContentBounds
class Box extends DisplayObject {
	private _w: number;
	private _h: number;

	constructor(w = 100, h = 100) {
		super();
		this._w = w;
		this._h = h;
	}

	override $measureContentBounds(bounds: Rectangle): void {
		bounds.setTo(0, 0, this._w, this._h);
	}
}

describe('DisplayObject — spatial operations', () => {
	// ── $hitTest ────────────────────────────────────────────────────────────

	it('$hitTest returns self when point is within bounds', () => {
		const obj = new Box(100, 100);
		const result = obj.$hitTest(50, 50);
		expect(result).toBe(obj);
	});

	it('$hitTest returns undefined when point is outside bounds', () => {
		const obj = new Box(100, 100);
		expect(obj.$hitTest(150, 50)).toBeUndefined();
		expect(obj.$hitTest(-1, 50)).toBeUndefined();
		expect(obj.$hitTest(50, 150)).toBeUndefined();
	});

	it('$hitTest transforms stage coords according to position', () => {
		const obj = new Box(100, 100);
		obj.x = 100;
		obj.y = 50;
		expect(obj.$hitTest(150, 75)).toBe(obj); // local (50, 25)
		expect(obj.$hitTest(50, 50)).toBeUndefined(); // local (-50, 0) — outside
	});

	it('$hitTest with scaling', () => {
		const obj = new Box(100, 100);
		obj.scaleX = 2;
		obj.scaleY = 2;
		// bounds are now effectively 200x200
		expect(obj.$hitTest(150, 50)).toBe(obj);
		expect(obj.$hitTest(250, 50)).toBeUndefined();
	});

	it('$hitTest returns undefined when invisible', () => {
		const obj = new Box(100, 100);
		obj.visible = false;
		expect(obj.$hitTest(50, 50)).toBeUndefined();
	});

	it('$hitTest returns undefined when scale is 0', () => {
		const obj = new Box(100, 100);
		obj.scaleX = 0;
		expect(obj.$hitTest(50, 50)).toBeUndefined();
	});

	// ── hitTestPoint ───────────────────────────────────────────────────────

	it('hitTestPoint returns true for point inside', () => {
		const obj = new Box(100, 100);
		expect(obj.hitTestPoint(50, 50)).toBe(true);
	});

	it('hitTestPoint returns false for point outside', () => {
		const obj = new Box(100, 100);
		expect(obj.hitTestPoint(200, 200)).toBe(false);
	});

	it('hitTestPoint returns false when scale is 0', () => {
		const obj = new Box(100, 100);
		obj.scaleX = 0;
		expect(obj.hitTestPoint(50, 50)).toBe(false);
	});

	// ── getBounds ──────────────────────────────────────────────────────────

	it('getBounds returns content bounds by default', () => {
		const obj = new Box(100, 50);
		const b = obj.getBounds();
		expect(b.x).toBe(0);
		expect(b.y).toBe(0);
		expect(b.width).toBe(100);
		expect(b.height).toBe(50);
	});

	it('getBounds with anchorOffset', () => {
		const obj = new Box(100, 100);
		obj.anchorOffsetX = 50;
		obj.anchorOffsetY = 50;
		const b = obj.getBounds();
		expect(b.x).toBe(-50);
		expect(b.y).toBe(-50);
	});

	it('getBounds without anchor calculation', () => {
		const obj = new Box(100, 100);
		obj.anchorOffsetX = 50;
		const b = obj.getBounds(undefined, false);
		expect(b.x).toBe(0);
	});

	// ── getTransformedBounds ───────────────────────────────────────────────

	it('getTransformedBounds to self returns original bounds', () => {
		const obj = new Box(100, 100);
		const b = obj.getTransformedBounds(obj);
		expect(b.x).toBe(0);
		expect(b.width).toBe(100);
	});

	it('getTransformedBounds transforms between coordinate spaces', () => {
		const container = new DisplayObjectContainer();
		const child = new Box(100, 100);
		container.addChild(child);
		child.x = 50;
		child.y = 50;

		// bounds of child in container space
		const b = child.getTransformedBounds(container);
		expect(b.x).toBe(50);
		expect(b.y).toBe(50);
		expect(b.width).toBe(100);
	});

	it('getTransformedBounds with null target uses self', () => {
		const obj = new Box(100, 100);
		const b = obj.getTransformedBounds(null as unknown as DisplayObject);
		expect(b.width).toBe(100);
	});

	// ── globalToLocal / localToGlobal ──────────────────────────────────────

	it('globalToLocal converts stage coords to local coords', () => {
		const obj = new Box(100, 100);
		obj.x = 50;
		obj.y = 30;
		const result = obj.globalToLocal(100, 80);
		expect(result.x).toBeCloseTo(50, 10);
		expect(result.y).toBeCloseTo(50, 10);
	});

	it('localToGlobal converts local coords to stage coords', () => {
		const obj = new Box(100, 100);
		obj.x = 50;
		obj.y = 30;
		const result = obj.localToGlobal(10, 20);
		expect(result.x).toBeCloseTo(60, 10);
		expect(result.y).toBeCloseTo(50, 10);
	});

	it('globalToLocal with provided resultPoint reuses it', () => {
		const obj = new Box(100, 100);
		const out = new Point();
		const result = obj.globalToLocal(50, 50, out);
		expect(result).toBe(out);
	});

	it('localToGlobal with provided resultPoint reuses it', () => {
		const obj = new Box(100, 100);
		const out = new Point();
		const result = obj.localToGlobal(10, 10, out);
		expect(result).toBe(out);
	});

	it('globalToLocal / localToGlobal round-trip', () => {
		const container = new DisplayObjectContainer();
		const child = new Box(50, 50);
		container.addChild(child);
		child.x = 100;
		child.y = 50;
		child.scaleX = 2;
		child.rotation = 30;

		const stageX = 200;
		const stageY = 100;
		const local = child.globalToLocal(stageX, stageY);
		const back = child.localToGlobal(local.x, local.y);

		expect(back.x).toBeCloseTo(stageX, 5);
		expect(back.y).toBeCloseTo(stageY, 5);
	});

	// ── $getConcatenatedMatrix ──────────────────────────────────────────────

	it('$getConcatenatedMatrix for root object matches own matrix', () => {
		const obj = new Box(100, 100);
		obj.x = 10;
		obj.y = 20;
		const m = obj.$getConcatenatedMatrix();
		expect(m.tx).toBe(10);
		expect(m.ty).toBe(20);
	});

	it('$getConcatenatedMatrix accumulates parent transforms', () => {
		const root = new DisplayObjectContainer();
		const child = new Box(100, 100);
		root.addChild(child);
		root.x = 100;
		child.x = 50;

		const m = child.$getConcatenatedMatrix();
		expect(m.tx).toBe(150); // 100 + 50
	});

	it('$getConcatenatedMatrix includes anchor offset', () => {
		const obj = new Box(100, 100);
		obj.x = 100;
		obj.anchorOffsetX = 30;
		const m = obj.$getConcatenatedMatrix();
		expect(m.tx).toBe(70); // 100 - 30
	});

	// ── $getInvertedConcatenatedMatrix ──────────────────────────────────────

	it('$getInvertedConcatenatedMatrix inverts the concatenated matrix', () => {
		const obj = new Box(100, 100);
		obj.x = 100;
		const inv = obj.$getInvertedConcatenatedMatrix();
		const p = inv.transformPoint(150, 50);
		expect(p.x).toBeCloseTo(50, 10);
		expect(p.y).toBeCloseTo(50, 10);
	});

	// ── cached bounds ──────────────────────────────────────────────────────

	it('$getOriginalBounds caches result until marked dirty', () => {
		const obj = new Box(100, 100);
		const b1 = obj.$getOriginalBounds();
		const b2 = obj.$getOriginalBounds();
		expect(b1).toBe(b2); // cached — same reference
	});
});
