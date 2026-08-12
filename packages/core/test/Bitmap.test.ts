import { describe, it, expect, vi, afterEach } from 'vitest';
import { Bitmap, setBitmapPixelHitTest } from '../src/blakron/display/Bitmap.js';
import { Texture } from '../src/blakron/display/texture/Texture.js';
import { BitmapData } from '../src/blakron/display/texture/BitmapData.js';
import { BitmapFillMode } from '../src/blakron/display/enums/BitmapFillMode.js';
import { RenderObjectType } from '../src/blakron/display/DisplayObject.js';
import { Rectangle } from '../src/blakron/geom/Rectangle.js';

function mockBitmapData(): BitmapData {
	const bd = new BitmapData();
	bd.width = 64;
	bd.height = 64;
	return bd;
}

function mockTexture(
	overrides: Partial<{
		bitmapX: number;
		bitmapY: number;
		bitmapWidth: number;
		bitmapHeight: number;
		offsetX: number;
		offsetY: number;
		textureWidth: number;
		textureHeight: number;
		sourceWidth: number;
		sourceHeight: number;
	}> = {},
): Texture {
	const t = new Texture();
	const bd = mockBitmapData();
	t.bitmapData = bd;
	t['initData'](
		overrides.bitmapX ?? 0,
		overrides.bitmapY ?? 0,
		overrides.bitmapWidth ?? 64,
		overrides.bitmapHeight ?? 64,
		overrides.offsetX ?? 0,
		overrides.offsetY ?? 0,
		overrides.textureWidth ?? 64,
		overrides.textureHeight ?? 64,
		overrides.sourceWidth ?? 64,
		overrides.sourceHeight ?? 64,
	);
	return t;
}

describe('Bitmap', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('$renderObjectType is BITMAP', () => {
		expect(new Bitmap().$renderObjectType).toBe(RenderObjectType.BITMAP);
	});

	it('default property values', () => {
		const bm = new Bitmap();
		expect(bm.texture).toBeUndefined();
		expect(bm.smoothing).toBe(true);
		expect(bm.fillMode).toBe(BitmapFillMode.SCALE);
		expect(bm.scale9Grid).toBeUndefined();
		expect(bm.pixelHitTest).toBe(false);
	});

	it('constructor with Texture sets texture and cached data', () => {
		const tex = mockTexture();
		const bm = new Bitmap(tex);
		expect(bm.texture).toBe(tex);
		expect(bm.bitmapData).toBe(tex.bitmapData);
		expect(bm.textureWidth).toBe(64);
	});

	it('texture setter updates cached image data', () => {
		const bm = new Bitmap();
		const tex = mockTexture({ bitmapWidth: 128, bitmapHeight: 256 });
		bm.texture = tex;
		expect(bm.bitmapWidth).toBe(128);
		expect(bm.bitmapHeight).toBe(256);
	});

	it('texture setter no-ops on same texture', () => {
		const tex = mockTexture();
		const bm = new Bitmap(tex);
		bm.$renderDirty = false;
		bm.texture = tex;
		expect(bm.$renderDirty).toBe(false);
	});

	it('setting texture to undefined clears image data', () => {
		const bm = new Bitmap(mockTexture());
		bm.texture = undefined;
		expect(bm.texture).toBeUndefined();
		expect(bm.bitmapData).toBeUndefined();
		expect(bm.$renderDirty).toBe(true);
	});

	it('smoothing follows Bitmap.defaultSmoothing', () => {
		Bitmap.defaultSmoothing = false;
		expect(new Bitmap().smoothing).toBe(false);
		Bitmap.defaultSmoothing = true;
	});

	it('smoothing no-ops on same value', () => {
		const bm = new Bitmap();
		bm.$renderDirty = false;
		bm.smoothing = true;
		expect(bm.$renderDirty).toBe(false);
	});

	it('fillMode setter marks $renderDirty', () => {
		const bm = new Bitmap();
		bm.fillMode = BitmapFillMode.REPEAT;
		expect(bm.fillMode).toBe(BitmapFillMode.REPEAT);
		expect(bm.$renderDirty).toBe(true);
	});

	it('fillMode no-ops on same value', () => {
		const bm = new Bitmap();
		bm.$renderDirty = false;
		bm.fillMode = BitmapFillMode.SCALE;
		expect(bm.$renderDirty).toBe(false);
	});

	it('scale9Grid setter marks $renderDirty', () => {
		const bm = new Bitmap();
		bm.scale9Grid = new Rectangle(10, 10, 44, 44);
		expect(bm.scale9Grid).toBeDefined();
		expect(bm.$renderDirty).toBe(true);
	});

	it('scale9Grid can be cleared', () => {
		const bm = new Bitmap();
		bm.scale9Grid = new Rectangle(10, 10, 44, 44);
		bm.scale9Grid = undefined;
		expect(bm.scale9Grid).toBeUndefined();
	});

	it('pixelHitTest coerces to boolean', () => {
		const bm = new Bitmap();
		bm.pixelHitTest = 1 as unknown as boolean;
		expect(bm.pixelHitTest).toBe(true);
		bm.pixelHitTest = 0 as unknown as boolean;
		expect(bm.pixelHitTest).toBe(false);
	});

	it('width returns texture width when not set', () => {
		const bm = new Bitmap(mockTexture({ textureWidth: 200 }));
		expect(bm.width).toBe(200);
	});

	it('width setter marks $renderDirty', () => {
		const bm = new Bitmap();
		bm.$renderDirty = false;
		bm.width = 300;
		expect(bm.$renderDirty).toBe(true);
	});

	it('width setter rejects negative', () => {
		const bm = new Bitmap(mockTexture());
		const w = bm.width;
		bm.width = -50;
		expect(bm.width).toBe(w);
	});

	it('width setter no-ops on same value', () => {
		const bm = new Bitmap();
		bm.width = 100;
		bm.$renderDirty = false;
		bm.width = 100;
		expect(bm.$renderDirty).toBe(false);
	});

	it('$measureContentBounds uses texture size', () => {
		const bm = new Bitmap(mockTexture({ textureWidth: 200, textureHeight: 150 }));
		const bounds = new Rectangle();
		bm['$measureContentBounds'](bounds);
		expect(bounds.width).toBe(200);
		expect(bounds.height).toBe(150);
	});

	it('$measureContentBounds uses explicit width/height', () => {
		const bm = new Bitmap(mockTexture());
		bm.width = 300;
		bm.height = 200;
		const bounds = new Rectangle();
		bm['$measureContentBounds'](bounds);
		expect(bounds.width).toBe(300);
	});

	it('$hitTest works without pixelHitTest', () => {
		const bm = new Bitmap(mockTexture({ textureWidth: 100, textureHeight: 100 }));
		expect(bm.$hitTest(50, 50)).toBe(bm);
	});

	it('$hitTest with pixelHitTest calls callback', () => {
		const bm = new Bitmap(mockTexture({ textureWidth: 100, textureHeight: 100 }));
		bm.pixelHitTest = true;
		const fn = vi.fn().mockReturnValue(true);
		setBitmapPixelHitTest(fn);
		expect(bm.$hitTest(50, 50)).toBe(bm);
		expect(fn).toHaveBeenCalledWith(bm, expect.any(Number), expect.any(Number));
	});

	it('$hitTest with pixelHitTest returns undefined on false callback', () => {
		const bm = new Bitmap(mockTexture({ textureWidth: 100, textureHeight: 100 }));
		bm.pixelHitTest = true;
		setBitmapPixelHitTest(() => false);
		expect(bm.$hitTest(50, 50)).toBeUndefined();
	});
});
