import { describe, it, expect } from 'vitest';
import { Texture } from '../src/blakron/display/texture/Texture.js';
import { BitmapData } from '../src/blakron/display/texture/BitmapData.js';

function makeBitmapData(): BitmapData {
	const bd = new BitmapData();
	bd.width = 128;
	bd.height = 256;
	return bd;
}

describe('Texture', () => {
	it('initData stores values at default scaleFactor=1', () => {
		const t = new Texture();
		t.bitmapData = makeBitmapData();
		t.initData(10, 20, 100, 200, 5, 5, 100, 200, 128, 256);

		expect(t.bitmapX).toBe(10);
		expect(t.bitmapY).toBe(20);
		expect(t.bitmapWidth).toBe(100);
		expect(t.bitmapHeight).toBe(200);
		expect(t.offsetX).toBe(5);
		expect(t.offsetY).toBe(5);
		expect(t.textureWidth).toBe(100);
		expect(t.textureHeight).toBe(200);
		expect(t.sourceWidth).toBe(128);
		expect(t.sourceHeight).toBe(256);
		expect(t.rotated).toBe(false);
	});

	it('initData with rotated flag', () => {
		const t = new Texture();
		t.bitmapData = makeBitmapData();
		t.initData(0, 0, 100, 200, 0, 0, 200, 100, 128, 256, true);
		expect(t.rotated).toBe(true);
	});

	it('setBitmapData uses full image dimensions', () => {
		const t = new Texture();
		const bd = makeBitmapData();
		t.setBitmapData(bd);

		expect(t.bitmapData).toBe(bd);
		expect(t.bitmapX).toBe(0);
		expect(t.bitmapY).toBe(0);
		expect(t.bitmapWidth).toBe(128);
		expect(t.bitmapHeight).toBe(256);
		expect(t.textureWidth).toBe(128);
		expect(t.textureHeight).toBe(256);
	});

	it('dispose with disposeBitmapData=true calls bitmapData.dispose', () => {
		const t = new Texture();
		const bd = makeBitmapData();
		let disposed = false;
		bd.dispose = () => {
			disposed = true;
		};
		t.bitmapData = bd;
		t.dispose();
		expect(disposed).toBe(true);
		expect(t.bitmapData).toBeUndefined();
	});

	it('dispose with disposeBitmapData=false skips bitmapData.dispose', () => {
		const t = new Texture();
		const bd = makeBitmapData();
		let disposed = false;
		bd.dispose = () => {
			disposed = true;
		};
		t.bitmapData = bd;
		t.disposeBitmapData = false;
		t.dispose();
		expect(disposed).toBe(false);
		expect(t.bitmapData).toBeUndefined();
	});

	it('dispose is safe when bitmapData is undefined', () => {
		expect(() => new Texture().dispose()).not.toThrow();
	});

	it('getPixel32 throws error', () => {
		expect(() => new Texture().getPixel32(0, 0)).toThrow('getPixel32 is not supported');
	});

	it('getPixels throws error', () => {
		expect(() => new Texture().getPixels(0, 0)).toThrow('getPixels requires renderer implementation');
	});

	it('toDataURL throws error', () => {
		expect(() => new Texture().toDataURL('png')).toThrow('toDataURL requires renderer implementation');
	});
});
