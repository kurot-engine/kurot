import { afterEach, describe, expect, it, vi } from 'vitest';
import { DisplayObject } from '../src/kurot/display/DisplayObject.js';
import { Bitmap } from '../src/kurot/display/Bitmap.js';
import { Sprite } from '../src/kurot/display/Sprite.js';
import { Shape } from '../src/kurot/display/Shape.js';
import { Matrix } from '../src/kurot/geom/Matrix.js';
import { Rectangle } from '../src/kurot/geom/Rectangle.js';

function makeShape(): Shape {
	const shape = new Shape();
	shape.graphics.beginFill(0xffffff);
	shape.graphics.drawRect(10, 20, 80, 40);
	shape.graphics.endFill();
	shape.x = 200;
	shape.y = 100;
	shape.touchEnabled = true;
	return shape;
}

function expectCoordinates(actual: { x: number; y: number }, expected: { x: number; y: number }): void {
	expect(actual.x).toBeCloseTo(expected.x, 10);
	expect(actual.y).toBeCloseTo(expected.y, 10);
}

function expectBounds(actual: Rectangle, expected: Rectangle): void {
	expectCoordinates(actual, expected);
	expect(actual.width).toBeCloseTo(expected.width, 10);
	expect(actual.height).toBeCloseTo(expected.height, 10);
}

function makeBitmap(): Bitmap {
	const bitmap = new Bitmap();
	bitmap.width = 100;
	bitmap.height = 80;
	bitmap.x = 200;
	bitmap.y = 100;
	bitmap.touchEnabled = true;
	return bitmap;
}

afterEach(() => vi.restoreAllMocks());

describe('centered display flips', () => {
	it('preserves the outer frame, authored transform and anchor for all flip combinations', () => {
		const parent = new Sprite();
		parent.rotation = -20;
		parent.scaleX = 1.2;
		const shape = makeShape();
		shape.anchorOffsetX = 15;
		shape.anchorOffsetY = 9;
		shape.matrix = new Matrix(-1.5, 0.3, 0.7, 0.9, 200, 100);
		parent.addChild(shape);
		const bounds = shape.getTransformedBounds(parent);
		const authored = shape.matrix;
		const center = shape.localToGlobal(50, 40);
		const original = shape.localToGlobal(15, 25);

		shape.flipX = true;
		expectCoordinates(shape.localToGlobal(85, 25), original);
		shape.flipY = true;
		expectCoordinates(shape.localToGlobal(85, 55), original);
		expectCoordinates(shape.localToGlobal(50, 40), center);
		expectBounds(shape.getTransformedBounds(parent), bounds);
		expect(shape.matrix).toEqual(authored);
		expect([shape.x, shape.y, shape.anchorOffsetX, shape.anchorOffsetY]).toEqual([200, 100, 15, 9]);
		shape.flipX = false;
		expectBounds(shape.getTransformedBounds(parent), bounds);
		shape.flipY = false;
		expect(shape.matrix).toEqual(authored);
	});

	it('keeps flips independent through scaling and matrix round trips', () => {
		const shape = makeShape();
		shape.flipX = true;
		shape.scaleX = 2;
		expect(shape.localToGlobal(10, 20).x).toBe(380);
		shape.matrix = shape.matrix;
		expect(shape.flipX).toBe(true);
		expect(shape.scaleX).toBe(2);
		expect(shape.localToGlobal(10, 20).x).toBe(380);
		shape.scaleX = -2;
		expect(shape.flipX).toBe(true);
		expect(shape.localToGlobal(10, 20).x).toBe(20);
		shape.flipX = false;
		expect(shape.localToGlobal(10, 20).x).toBe(180);
	});

	it('maps pointer coordinates and hit regions through the same reflection', () => {
		const shape = makeBitmap();
		shape.flipX = true;
		shape.flipY = true;
		const point = shape.localToGlobal(20, 30);
		expect(shape.globalToLocal(point.x, point.y)).toEqual({ x: 20, y: 30 });
		expect(shape.$hitTest(point.x, point.y)).toBe(shape);
		expect(shape.hitTestPoint(point.x, point.y)).toBe(true);
		expect(shape.hitTestPoint(199, 100)).toBe(false);
		shape.scaleX = 0;
		expect(shape.$hitTest(point.x, point.y)).toBeUndefined();
	});

	it('uses the visible scroll viewport center and keeps its clip fixed', () => {
		const shape = makeBitmap();
		shape.scrollRect = new Rectangle(10, 20, 40, 30);
		const before = shape.localToGlobal(10, 20);
		shape.flipX = true;
		shape.flipY = true;
		expect(shape.localToGlobal(50, 50)).toEqual(before);
		expect(shape.$hitTest(210, 110)).toBe(shape);
		expect(shape.$hitTest(245, 135)).toBeUndefined();
	});

	it('refreshes a reflected ancestor and its sibling transforms when content bounds change', () => {
		const parent = new Sprite();
		parent.flipX = true;
		const first = makeShape();
		first.x = 0;
		const second = makeShape();
		second.x = 100;
		parent.addChild(first);
		parent.addChild(second);
		expect(first.localToGlobal(10, 20).x).toBe(190);
		const oldHook = DisplayObject.$onRenderableDirty;
		const changed: DisplayObject[] = [];
		DisplayObject.$onRenderableDirty = object => changed.push(object);
		try {
			second.x = 200;
			expect(changed).toContain(parent);
			expect(first.localToGlobal(10, 20).x).toBe(290);
		} finally {
			DisplayObject.$onRenderableDirty = oldHook;
		}
	});

	it('defaults to no reflection and ignores repeated assignments', () => {
		const shape = makeShape();
		expect([shape.flipX, shape.flipY, shape.$useTranslate]).toEqual([false, false, false]);
		const dirty = vi.spyOn(shape, '$markTransformDirty');
		shape.flipX = true;
		shape.flipX = true;
		expect(dirty).toHaveBeenCalledTimes(1);
		expect(shape.$useTranslate).toBe(true);
		shape.flipX = false;
		expect(shape.$useTranslate).toBe(false);
	});
});
