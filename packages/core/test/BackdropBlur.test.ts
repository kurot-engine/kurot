import { describe, expect, it } from 'vitest';
import { BackdropBlur, DisplayObject, Matrix, Sprite } from '../src/index.js';
import { assertBackdropCache, backdropBounds, validateBackdrop } from '../src/kurot/player/backdrop.js';

describe('BackdropBlur public contract', () => {
	it('has empty local dimensions and explicit input pass-through defaults', () => {
		const previous = DisplayObject.defaultTouchEnabled;
		DisplayObject.defaultTouchEnabled = true;
		try {
			const node = new BackdropBlur();
			expect(node.width).toBe(0);
			expect(node.height).toBe(0);
			expect(node.blurX).toBe(4);
			expect(node.blurY).toBe(4);
			expect(node.quality).toBe(1);
			expect(node.resolution).toBeUndefined();
			expect(node.touchEnabled).toBe(false);
		} finally {
			DisplayObject.defaultTouchEnabled = previous;
		}
	});

	it('resizes content, invalidates parent bounds and preserves authored scale', () => {
		const parent = new Sprite();
		const node = new BackdropBlur({ width: 40, height: 20 });
		parent.addChild(node);
		node.scaleX = 2;
		expect(parent.width).toBe(80);
		node.width = 60;
		node.height = 30;
		expect(node.scaleX).toBe(2);
		expect(node.measuredWidth).toBe(60);
		expect(parent.width).toBe(120);
		expect(parent.height).toBe(30);
	});

	it('passes hit testing to lower siblings even through ordinary containers', () => {
		const parent = new Sprite();
		const back = new BackdropBlur({ width: 80, height: 80 });
		const front = new BackdropBlur({ width: 80, height: 80 });
		back.touchEnabled = true;
		parent.addChild(back);
		parent.addChild(front);
		expect(parent.$hitTest(20, 20)).toBe(back);
		front.touchEnabled = true;
		expect(parent.$hitTest(20, 20)).toBe(front);
	});

	it.each([-1, NaN, Infinity, -Infinity])('rejects invalid dimensions and radii: %s', value => {
		const node = new BackdropBlur();
		expect(() => { node.width = value; }).toThrow(RangeError);
		expect(() => { node.height = value; }).toThrow(RangeError);
		expect(() => { node.blurX = value; }).toThrow(RangeError);
		expect(() => { node.blurY = value; }).toThrow(RangeError);
	});

	it.each([0, 17, 1.5, NaN])('shares quality validation: %s', quality => {
		expect(() => new BackdropBlur({ quality })).toThrow(RangeError);
	});

	it.each([0, -1, Infinity, NaN])('shares resolution validation: %s', resolution => {
		expect(() => new BackdropBlur({ resolution })).toThrow(RangeError);
	});

	it('rejects cached subtrees and leaves ordinary caches valid', () => {
		const parent = new Sprite();
		const child = new Sprite();
		parent.addChild(child);
		expect(() => assertBackdropCache(parent)).not.toThrow();
		child.addChild(new BackdropBlur());
		expect(() => assertBackdropCache(parent)).toThrow('cacheAsTexture');
		child.removeChildren();
		expect(() => assertBackdropCache(parent)).not.toThrow();
	});

	it('rejects a non-normal blend operation instead of silently changing semantics', () => {
		const node = new BackdropBlur();
		node.blendMode = 'lighter';
		expect(() => validateBackdrop(node)).toThrow('normal blendMode');
	});

	it('encloses transformed sample corners using physical floor and ceil', () => {
		const result = backdropBounds(new Matrix(-2, 0.5, 0.25, 1, 50.4, 20.6), 20, 10, 3, 4);
		expect(result).toEqual({ left: 3, top: 15, right: 60, bottom: 47 });
	});
});
