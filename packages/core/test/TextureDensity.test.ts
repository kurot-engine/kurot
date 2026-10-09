import { afterEach, describe, expect, it, vi } from 'vitest';
import { Bitmap, BitmapData, BitmapFillMode, BitmapFont, Rectangle, SpriteSheet, Texture } from '../src/index.js';
import { BitmapPipe } from '../src/kurot/player/pipes/BitmapPipe.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';
import type { RenderBuffer } from '../src/kurot/player/RenderBuffer.js';

function image(resolution: number, trimmed = false): Bitmap {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 128 * resolution;
	const texture = new Texture(resolution);
	texture.setBitmapData(new BitmapData(canvas));
	const sheet = new SpriteSheet(texture);
	return new Bitmap(sheet.createTexture('button', 10 * resolution, 20 * resolution,
		(trimmed ? 24 : 48) * resolution, (trimmed ? 24 : 48) * resolution,
		trimmed ? 8 * resolution : 0, trimmed ? 8 * resolution : 0, 48 * resolution, 48 * resolution));
}

function draws(bitmap: Bitmap, canvas: boolean): number[][] {
	const drawImage = vi.fn();
	if (canvas) {
		new CanvasRenderer().renderBitmapToContext(bitmap, { drawImage } as unknown as CanvasRenderingContext2D, 0, 0);
	} else {
		new BitmapPipe().execute({ renderPipeId: 'bitmap', renderable: bitmap, offsetX: 0, offsetY: 0 }, {
			context: { drawImage }, offsetX: 0, offsetY: 0,
		} as unknown as RenderBuffer);
	}
	return drawImage.mock.calls.map(call => call.slice(1, 9) as number[]);
}

afterEach(() => vi.restoreAllMocks());

describe('texture source density', () => {
	it.each([0, -1, NaN, Infinity])('rejects invalid density %s', resolution => {
		expect(() => new Texture(resolution)).toThrow(RangeError);
	});
	it('mixes independent densities while retaining physical page and frame coordinates', () => {
		for (const resolution of [1, 1.5, 2, 3]) {
			const bitmap = image(resolution);
			expect([bitmap.width, bitmap.height]).toEqual([48, 48]);
			expect(bitmap.texture?.resolution).toBe(resolution);
			expect(bitmap.texture?.scaleBitmapWidth).toBe(48);
			expect(bitmap.bitmapWidth).toBe(48 * resolution);
			expect(bitmap.sourceWidth).toBe(128 * resolution);
		}
	});
	it('converts a trimmed parent origin back to source pixels before creating nested views', () => {
		const parent = image(2, true).texture!;
		const child = new SpriteSheet(parent).createTexture('inside', 12, 20, 16, 20);
		expect([child.bitmapX, child.bitmapY]).toEqual([16, 44]);
		expect([child.textureWidth, child.textureHeight, child.resolution]).toEqual([8, 10, 2]);
	});
	it('keeps literal bitmap-font metrics separate from texture density', () => {
		expect(() => new BitmapFont(image(2).texture!, { frames: { A: { x: 0, y: 0, w: 4, h: 8 } } }))
			.toThrow('resolution=1');
	});
});

describe.each([false, true])('density-aware geometry, Canvas=%s', canvas => {
	it.each([1, 2, 3])('preserves logical trim offsets and resized bounds at density %s', resolution => {
		const bitmap = image(resolution, true);
		bitmap.width = 96;
		bitmap.height = 24;
		expect(draws(bitmap, canvas)).toEqual([[10 * resolution, 20 * resolution,
			24 * resolution, 24 * resolution, 16, 4, 48, 12]]);
	});
	it.each([1, 2, 3])('keeps nine-slice borders and margins fixed at density %s', resolution => {
		const bitmap = image(resolution, true);
		bitmap.width = 120;
		bitmap.height = 72;
		bitmap.scale9Grid = new Rectangle(16, 16, 8, 8);
		const calls = draws(bitmap, canvas);
		expect(calls).toHaveLength(9);
		expect(calls[0]).toEqual([10 * resolution, 20 * resolution, 8 * resolution, 8 * resolution, 8, 8, 8, 8]);
		expect(calls[4].slice(4)).toEqual([16, 16, 80, 32]);
		expect(calls[8].slice(4)).toEqual([96, 48, 8, 8]);
	});
	it('uses logical fixed borders for the small nine-slice fallback', () => {
		const bitmap = image(2, true);
		bitmap.width = bitmap.height = 32;
		bitmap.scale9Grid = new Rectangle(16, 16, 8, 8);
		expect(draws(bitmap, canvas)).toEqual([[20, 40, 48, 48, 8, 8, 8, 8]]);
	});
	it.each([BitmapFillMode.CLIP, BitmapFillMode.REPEAT])('uses the original logical period for %s', mode => {
		const bitmap = image(2, true);
		bitmap.fillMode = mode;
		bitmap.width = 62;
		bitmap.height = 60;
		const calls = draws(bitmap, canvas);
		expect(calls[0]).toEqual([20, 40, 48, 48, 8, 8, 24, 24]);
		if (mode === BitmapFillMode.REPEAT) {
			expect(calls).toHaveLength(4);
			expect(calls.at(-1)).toEqual([20, 40, 12, 8, 56, 56, 6, 4]);
		} else {
			expect(calls).toHaveLength(1);
		}
	});
});

it('rotated high-density repeat crops sample upright physical regions', () => {
	const bitmap = image(2, true);
	bitmap.texture!.rotated = true;
	bitmap.fillMode = BitmapFillMode.REPEAT;
	bitmap.width = 62;
	bitmap.height = 60;
	expect(draws(bitmap, false).at(-1)).toEqual([60, 40, 12, 8, 56, 56, 6, 4]);
});
