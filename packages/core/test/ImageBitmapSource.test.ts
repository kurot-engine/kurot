import { afterEach, expect, it, vi } from 'vitest';
import { BitmapData } from '../src/kurot/display/texture/BitmapData.js';

class DecodedBitmap {
	public readonly width = 16;
	public readonly height = 8;
	public closes = 0;
	public close(): void {
		this.closes++;
	}
}

afterEach(() => vi.unstubAllGlobals());

it('closes an owned decoded bitmap exactly once when pixels are disposed', () => {
	vi.stubGlobal('ImageBitmap', DecodedBitmap);
	const source = new DecodedBitmap();
	const bitmap = new BitmapData(source);
	expect(bitmap.width).toBe(16);
	expect(bitmap.height).toBe(8);
	bitmap.dispose();
	bitmap.dispose();
	expect(source.closes).toBe(1);
	expect(bitmap.source).toBeUndefined();
});

it('does not close a borrowed decoded bitmap', () => {
	vi.stubGlobal('ImageBitmap', DecodedBitmap);
	const source = new DecodedBitmap();
	const bitmap = new BitmapData();
	bitmap.deleteSource = false;
	Reflect.set(bitmap, 'source', source);
	bitmap.dispose();
	expect(source.closes).toBe(0);
});

it('releases the upload and pixel source even when one cleanup throws', () => {
	vi.stubGlobal('ImageBitmap', DecodedBitmap);
	const source = new DecodedBitmap();
	const bitmap = new BitmapData(source);
	let uploads = 0;
	bitmap.$setTextureDisposer(() => {
		uploads++;
		throw new Error('upload cleanup');
	});
	expect(() => bitmap.dispose()).toThrow(AggregateError);
	expect(source.closes).toBe(1);
	expect(uploads).toBe(1);
	bitmap.dispose();
	expect(uploads).toBe(1);
});
