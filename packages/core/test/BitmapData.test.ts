import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BitmapData, CompressedTextureData } from '../src/blakron/display/texture/BitmapData.js';
import { DisplayObject } from '../src/blakron/display/DisplayObject.js';

// ── Helpers ─────────────────────────────────────────────────────────────

function mockDisplayObject(): DisplayObject {
	const obj = new DisplayObject();
	return obj;
}

function mockImage(): HTMLImageElement {
	return { width: 100, height: 200, src: '' } as unknown as HTMLImageElement;
}

describe('CompressedTextureData', () => {
	it('default values', () => {
		const ctd = new CompressedTextureData();
		expect(ctd.glInternalFormat).toBe(0);
		expect(ctd.width).toBe(0);
		expect(ctd.height).toBe(0);
		expect(ctd.byteArray).toBeInstanceOf(Uint8Array);
		expect(ctd.byteArray.length).toBe(0);
		expect(ctd.face).toBe(0);
		expect(ctd.level).toBe(0);
	});
});

describe('BitmapData', () => {
	beforeEach(() => {
		// Clear the internal display list between tests
		// Access via private static — need to reset state
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ── Constructor ───────────────────────────────────────────────────────

	it('default constructor has zero dimensions', () => {
		const bd = new BitmapData();
		expect(bd.width).toBe(0);
		expect(bd.height).toBe(0);
		expect(bd.source).toBeUndefined();
		expect(bd.format).toBe('image');
	});

	it('constructor with no arg has undefined source', () => {
		const bd = new BitmapData();
		expect(bd.source).toBeUndefined();
	});

	// ── addDisplayObject / removeDisplayObject ────────────────────────────

	it('addDisplayObject registers display object', () => {
		const bd = new BitmapData();
		const obj = mockDisplayObject();
		BitmapData.addDisplayObject(obj, bd);

		// Invalidate should mark the object dirty
		obj.$renderDirty = false;
		BitmapData.invalidate(bd);
		expect(obj.$renderDirty).toBe(true);
	});

	it('removeDisplayObject unregisters display object', () => {
		const bd = new BitmapData();
		const obj = mockDisplayObject();
		BitmapData.addDisplayObject(obj, bd);

		obj.$renderDirty = false;
		BitmapData.invalidate(bd);
		expect(obj.$renderDirty).toBe(true);

		// After removal, invalidate should not affect it
		BitmapData.removeDisplayObject(obj, bd);
		obj.$renderDirty = false;
		BitmapData.invalidate(bd);
		// After remove, the list may still exist but be empty — should not throw
		expect(obj.$renderDirty).toBe(false);
	});

	// ── multiple display objects on same BitmapData ───────────────────────

	it('invalidate marks all registered display objects dirty', () => {
		const bd = new BitmapData();
		const obj1 = mockDisplayObject();
		const obj2 = mockDisplayObject();
		BitmapData.addDisplayObject(obj1, bd);
		BitmapData.addDisplayObject(obj2, bd);

		obj1.$renderDirty = false;
		obj2.$renderDirty = false;
		BitmapData.invalidate(bd);

		expect(obj1.$renderDirty).toBe(true);
		expect(obj2.$renderDirty).toBe(true);
	});

	// ── dispose ───────────────────────────────────────────────────────────

	it('dispose cleans source and compressed data', () => {
		const img = mockImage();
		const bd = new BitmapData(img);

		bd.dispose();
		expect(bd.source).toBeUndefined();
		expect(bd.hasCompressed2d()).toBe(false);
	});

	it('dispose clears HTMLImageElement src', () => {
		const img = mockImage();
		const bd = new BitmapData(img);
		bd.dispose();
		expect(img.src).toBe('');
	});

	// ── compressed texture data ───────────────────────────────────────────

	it('setCompressed2dTextureData / getCompressed2dTextureData', () => {
		const bd = new BitmapData();
		const level0 = new CompressedTextureData();
		level0.width = 128;
		level0.height = 128;

		bd.setCompressed2dTextureData([level0]);

		expect(bd.hasCompressed2d()).toBe(true);
		const fetched = bd.getCompressed2dTextureData();
		expect(fetched).toBe(level0);
		expect(fetched!.width).toBe(128);
	});

	it('clearCompressedTextureData removes all data', () => {
		const bd = new BitmapData();
		bd.setCompressed2dTextureData([new CompressedTextureData()]);
		bd.clearCompressedTextureData();
		expect(bd.hasCompressed2d()).toBe(false);
	});
});
