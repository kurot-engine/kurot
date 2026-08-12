import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { DisplayObject, RenderMode } from '../src/blakron/display/DisplayObject.js';
import { DisplayObjectContainer } from '../src/blakron/display/DisplayObjectContainer.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';
import { Matrix } from '../src/blakron/geom/Matrix.js';
import { BlurFilter } from '../src/blakron/filters/BlurFilter.js';
import { Event } from '../src/blakron/events/Event.js';
import { TouchEvent } from '../src/blakron/events/TouchEvent.js';
import { FocusEvent } from '../src/blakron/events/FocusEvent.js';

class BoundedChild extends DisplayObject {
	public override $measureContentBounds(bounds: Rectangle): void {
		bounds.setTo(0, 0, 10, 10);
	}
}

beforeEach(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('DisplayObject', () => {
	it('x/y setter marks transform without invalidating render content', () => {
		const obj = new DisplayObject();
		obj.$renderDirty = false;
		obj.x = 10;
		expect(obj.x).toBe(10);
		expect(obj.$renderDirty).toBe(false);
	});

	it('x setter no-op for same value', () => {
		const obj = new DisplayObject();
		obj.x = 5;
		obj.$renderDirty = false;
		obj.x = 5;
		expect(obj.$renderDirty).toBe(false);
	});

	it('scaleX/Y setter updates $useTranslate', () => {
		const obj = new DisplayObject();
		expect(obj.$useTranslate).toBe(false);
		obj.scaleX = 2;
		expect(obj.$useTranslate).toBe(true);
		obj.scaleX = 1;
		expect(obj.$useTranslate).toBe(false);
	});

	it('rotation setter updates matrix dirty', () => {
		const obj = new DisplayObject();
		obj.rotation = 45;
		expect(obj.rotation).toBe(45);
		expect(obj.$useTranslate).toBe(true);
	});

	it('alpha setter marks transform without invalidating render content', () => {
		const obj = new DisplayObject();
		obj.$renderDirty = false;
		obj.alpha = 0.5;
		expect(obj.alpha).toBe(0.5);
		expect(obj.$renderDirty).toBe(false);
	});

	it('visible=false sets $renderMode NONE', () => {
		const obj = new DisplayObject();
		obj.visible = false;
		expect(obj.$renderMode).toBe(RenderMode.NONE);
	});

	it('filters sets $renderMode FILTER', () => {
		const obj = new DisplayObject();
		obj.visible = true;
		obj.filters = [new BlurFilter(4, 4)];
		expect(obj.$renderMode).toBe(RenderMode.FILTER);
	});

	it('filters empty restores $renderMode', () => {
		const obj = new DisplayObject();
		obj.filters = [new BlurFilter()];
		expect(obj.$renderMode).toBe(RenderMode.FILTER);
		obj.filters = [];
		expect(obj.$renderMode).toBeUndefined();
	});

	it('mask with Rectangle sets SCROLLRECT mode', () => {
		const obj = new DisplayObject();
		obj.mask = new Rectangle(0, 0, 100, 100);
		expect(obj.$renderMode).toBe(RenderMode.SCROLLRECT);
	});

	it('mask with DisplayObject sets CLIP mode', () => {
		const obj = new DisplayObject();
		const maskObj = new DisplayObject();
		maskObj.$stage = {} as any;
		obj.mask = maskObj;
		expect(obj.$renderMode).toBe(RenderMode.CLIP);
		expect(maskObj.$renderMode).toBe(RenderMode.NONE);
	});

	it('replacing or clearing a DisplayObject mask restores its render mode', () => {
		const obj = new DisplayObject();
		const firstMask = new DisplayObject();
		const secondMask = new DisplayObject();
		obj.mask = firstMask;
		obj.mask = secondMask;
		expect(firstMask.$renderMode).toBeUndefined();
		expect(secondMask.$renderMode).toBe(RenderMode.NONE);
		obj.mask = undefined;
		expect(secondMask.$renderMode).toBeUndefined();
	});

	it('mask=undefined clears mask', () => {
		const obj = new DisplayObject();
		obj.mask = new Rectangle(0, 0, 100, 100);
		obj.mask = undefined;
		expect(obj.$maskRect).toBeUndefined();
		expect(obj.$renderMode).toBeUndefined();
	});

	it('tint setter updates $tintRGB', () => {
		const obj = new DisplayObject();
		obj.tint = 0xff0000;
		expect(obj.tint).toBe(0xff0000);
		expect(obj.$tintRGB).toBe((0xff0000 >> 16) + (0xff0000 & 0xff00) + ((0xff0000 & 0xff) << 16));
	});

	it('$getMatrix returns correct matrix for translation', () => {
		const obj = new DisplayObject();
		obj.x = 10;
		obj.y = 20;
		const m = obj.$getMatrix();
		expect(m.tx).toBe(10);
		expect(m.ty).toBe(20);
	});

	it('$worldAlpha is computed in $markDirty', () => {
		const obj = new DisplayObject();
		obj.alpha = 0.5;
		expect(obj.$worldAlpha).toBeCloseTo(0.5, 10);
	});

	it('$onRenderableDirty callback is called', () => {
		const fn = vi.fn();
		const prev = DisplayObject.$onRenderableDirty;
		DisplayObject.$onRenderableDirty = fn;
		const obj = new DisplayObject();
		obj.x = 99;
		expect(fn).toHaveBeenCalledWith(obj);
		DisplayObject.$onRenderableDirty = prev;
	});

	it('cacheAsTexture exposes the modern cache lifecycle while cacheAsBitmap stays compatible', () => {
		const obj = new DisplayObject();
		obj.cacheAsTexture({ resolution: 2, scaleMode: 'nearest' });
		expect(obj.cacheAsBitmap).toBe(true);
		expect(obj.isCachedAsTexture).toBe(true);
		expect(obj.$displayList?.resolution).toBe(2);
		expect(obj.$displayList?.scaleMode).toBe('nearest');

		obj.cacheAsBitmap = false;
		expect(obj.isCachedAsTexture).toBe(false);
		expect(obj.$displayList).toBeUndefined();
	});

	it('moving a cached root reuses its pixels but invalidates a cached parent', () => {
		const parent = new DisplayObjectContainer();
		const child = new DisplayObject();
		parent.addChild(child);
		parent.cacheAsBitmap = true;
		child.cacheAsBitmap = true;
		parent.$cacheDirty = false;
		child.$cacheDirty = false;
		child.$renderDirty = false;

		child.x = 20;

		expect(child.$cacheDirty).toBe(false);
		expect(child.$renderDirty).toBe(false);
		expect(parent.$cacheDirty).toBe(true);
	});

	it('moving a child invalidates its direct parent bounds for cache resizing', () => {
		const parent = new DisplayObjectContainer();
		const child = new BoundedChild();
		parent.addChild(child);
		expect(parent.$getOriginalBounds().x).toBe(0);

		parent.$cacheDirty = false;
		child.x = 40;

		expect(parent.$getOriginalBounds().x).toBe(40);
		expect(parent.$getOriginalBounds().width).toBe(10);
	});

	it('updateCacheTexture explicitly invalidates cached pixels and cached ancestors', () => {
		const parent = new DisplayObjectContainer();
		const child = new DisplayObject();
		parent.addChild(child);
		parent.cacheAsBitmap = true;
		child.cacheAsBitmap = true;
		parent.$cacheDirty = false;
		child.$cacheDirty = false;

		child.updateCacheTexture();

		expect(child.$cacheDirty).toBe(true);
		expect(parent.$cacheDirty).toBe(true);
	});

	it('$onStructureChange callback is called on $renderMode change', () => {
		const fn = vi.fn();
		const prev = DisplayObject.$onStructureChange;
		DisplayObject.$onStructureChange = fn;
		const obj = new DisplayObject();
		obj.visible = false;
		expect(fn).toHaveBeenCalled();
		DisplayObject.$onStructureChange = prev;
	});

	it('scrollRect', () => {
		const obj = new DisplayObject();
		const rect = new Rectangle(10, 20, 100, 200);
		obj.scrollRect = rect;
		expect(obj.scrollRect).toBeDefined();
		expect(obj.scrollRect!.x).toBe(10);
		expect(obj.$renderMode).toBe(RenderMode.SCROLLRECT);
	});

	// ── P0 遗漏 ──

	it('tint clamps overflow (> 0xffffff)', () => {
		const obj = new DisplayObject();
		obj.tint = 0x1ffffff;
		expect(obj.tint).toBe(0xffffff);
	});

	it('tint clamps negative to 0xffffff', () => {
		const obj = new DisplayObject();
		obj.tint = -100;
		expect(obj.tint).toBe(0xffffff);
	});

	it('tint with NaN defaults to 0xffffff', () => {
		const obj = new DisplayObject();
		obj.tint = NaN;
		expect(obj.tint).toBe(0xffffff);
	});

	it('$setMatrix updates x/y from matrix values', () => {
		const obj = new DisplayObject();
		const m = new Matrix(2, 0, 0, 3, 50, 60);
		obj['$setMatrix'](m);
		expect(obj.x).toBe(50);
		expect(obj.y).toBe(60);
	});

	it('$setMatrix with needUpdateProperties=false skips derivation', () => {
		const obj = new DisplayObject();
		const m = new Matrix(2, 0, 0, 3, 50, 60);
		obj['$setMatrix'](m, false);
		expect(obj.x).toBe(50);
	});

	it('ENTER_FRAME adds to static callback list', () => {
		const obj = new DisplayObject();
		const fn = vi.fn();
		obj.addEventListener(Event.ENTER_FRAME, fn);
		expect(DisplayObject.$enterFrameCallBackList).toContain(obj);
		obj.removeEventListener(Event.ENTER_FRAME, fn);
		expect(DisplayObject.$enterFrameCallBackList).not.toContain(obj);
	});

	it('RENDER adds to static callback list', () => {
		const obj = new DisplayObject();
		const fn = vi.fn();
		obj.addEventListener(Event.RENDER, fn);
		expect(DisplayObject.$renderCallBackList).toContain(obj);
		obj.removeEventListener(Event.RENDER, fn);
		expect(DisplayObject.$renderCallBackList).not.toContain(obj);
	});

	it('mask=self is rejected', () => {
		const obj = new DisplayObject();
		obj.mask = obj;
		expect(obj.mask).toBeUndefined();
	});
});

// ── Compile-time type assertions for DisplayObjectEvents inference ────────
// These `it()` blocks have no runtime assertions; they exist so that `tsc`
// verifies the typed-overload inferences. Each line that should NOT compile
// is gated by @ts-expect-error — if it ever compiles, the test fails to type
// and `tsc` will flag it. Lines that SHOULD compile must type-check cleanly.

it('type-check: TouchEvent payload infers without `as` (compiled away)', () => {
	const sprite = new DisplayObject();

	sprite.addEventListener(TouchEvent.TOUCH_TAP, (e) => {
		const x: number = e.stageX;
		const y: number = e.stageY;
		const id: number = e.touchPointID;
		const down: boolean = e.touchDown;
		void [x, y, id, down];
	});

	sprite.addEventListener(TouchEvent.TOUCH_BEGIN, (e) => {
		const _: TouchEvent = e;
		void _;
	});
});

it('type-check: FocusEvent payload infers', () => {
	const sprite = new DisplayObject();
	sprite.addEventListener(FocusEvent.FOCUS_IN, (e) => {
		const _: FocusEvent = e;
		void _;
	});
});

it('type-check: base Event payload infers for ADDED / ENTER_FRAME / etc.', () => {
	const sprite = new DisplayObject();
	sprite.addEventListener(Event.ENTER_FRAME, (e) => {
		const type: string = e.type;
		void type;
	});
	sprite.once(Event.ADDED_TO_STAGE, (e) => {
		const t: string = e.type;
		void t;
	});
});

it('type-check: removeEventListener matches typed path', () => {
	const sprite = new DisplayObject();
	const handler = (e: TouchEvent) => void e.stageX;
	sprite.addEventListener(TouchEvent.TOUCH_MOVE, handler);
	sprite.removeEventListener(TouchEvent.TOUCH_MOVE, handler);
});

it('type-check: unknown type strings fall back to (e: Event) => void', () => {
	const sprite = new DisplayObject();
	sprite.addEventListener('myCustomEvent', (e) => {
		const t: string = e.type;
		void t;
	});
});

it('type-check: wrong-type access is rejected at compile time', () => {
	const sprite = new DisplayObject();

	sprite.addEventListener(Event.ENTER_FRAME, (e) => {
		// @ts-expect-error — stageX is on TouchEvent, not on the Event payload for ENTER_FRAME
		const x: number = e.stageX;
		void x;
	});

	sprite.addEventListener('touchTapp', (e) => {
		// @ts-expect-error — 'touchTapp' is not a declared key; falls back to Event, no stageX
		const x: number = e.stageX;
		void x;
	});
});
