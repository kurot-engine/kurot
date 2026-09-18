import { afterEach, describe, expect, it, vi } from 'vitest';
import { Bitmap } from '../src/kurot/display/Bitmap.js';
import { BitmapData } from '../src/kurot/display/texture/BitmapData.js';
import { Texture } from '../src/kurot/display/texture/Texture.js';
import { Rectangle } from '../src/kurot/geom/Rectangle.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';
import { BitmapPipe } from '../src/kurot/player/pipes/BitmapPipe.js';
import type { RenderBuffer } from '../src/kurot/player/RenderBuffer.js';

function makeBitmap(trimmed = true): Bitmap {
	const texture = new Texture();
	texture.bitmapData = new BitmapData(document.createElement('canvas'));
	texture.initData(35, 172, trimmed ? 31 : 46, trimmed ? 31 : 46,
		trimmed ? 7 : 0, trimmed ? 7 : 0, 46, 46, 256, 256);
	return new Bitmap(texture);
}

function drawBitmap(bitmap: Bitmap): ReturnType<typeof vi.fn> {
	const drawImage = vi.fn();
	const buffer = { context: { drawImage }, offsetX: 0, offsetY: 0 } as unknown as RenderBuffer;
	new BitmapPipe().execute({ renderPipeId: 'bitmap', renderable: bitmap, offsetX: 0, offsetY: 0 }, buffer);
	return drawImage;
}

afterEach(() => vi.restoreAllMocks());

describe('trimmed bitmap rendering', () => {
	it('preserves the 31px close icon inside its 46px original canvas', () => {
		const bitmap = makeBitmap();
		const draw = drawBitmap(bitmap);
		expect(draw).toHaveBeenCalledOnce();
		expect(draw.mock.calls[0].slice(1, 9)).toEqual([35, 172, 31, 31, 7, 7, 31, 31]);
	});

	it('scales trim offsets and cropped dimensions independently on both axes', () => {
		const bitmap = makeBitmap();
		bitmap.width = 92;
		bitmap.height = 23;
		expect(drawBitmap(bitmap).mock.calls[0].slice(5, 9)).toEqual([14, 3.5, 62, 15.5]);
	});

	it('does not change untrimmed images', () => {
		const bitmap = makeBitmap(false);
		bitmap.width = 92;
		bitmap.height = 23;
		expect(drawBitmap(bitmap).mock.calls[0].slice(5, 9)).toEqual([0, 0, 92, 23]);
	});

	it('preserves rotated texture metadata and logical trim dimensions', () => {
		const bitmap = makeBitmap();
		bitmap.texture!.rotated = true;
		const call = drawBitmap(bitmap).mock.calls[0];
		expect(call.slice(5, 9)).toEqual([7, 7, 31, 31]);
		expect(call[11]).toBe(true);
	});

	it('does not draw a zero-sized bitmap', () => {
		const bitmap = makeBitmap();
		bitmap.width = 0;
		expect(drawBitmap(bitmap)).not.toHaveBeenCalled();
	});

	it('nine-slice keeps trim margins and borders fixed while stretching the center', () => {
		const bitmap = makeBitmap();
		bitmap.width = 92;
		bitmap.height = 92;
		bitmap.scale9Grid = new Rectangle(15, 15, 16, 16);
		const calls = drawBitmap(bitmap).mock.calls;
		expect(calls).toHaveLength(9);
		expect(calls[0].slice(5, 9)).toEqual([7, 7, 8, 8]);
		expect(calls[4].slice(5, 9)).toEqual([15, 15, 62, 62]);
		expect(calls[8].slice(5, 9)).toEqual([77, 77, 7, 7]);
	});

	it('nine-slice small-size fallback does not include trimmed transparent margins in the content', () => {
		const bitmap = makeBitmap();
		bitmap.width = 24;
		bitmap.height = 24;
		bitmap.scale9Grid = new Rectangle(15, 15, 16, 16);
		const calls = drawBitmap(bitmap).mock.calls;
		expect(calls).toHaveLength(1);
		expect(calls[0].slice(5, 9)).toEqual([7, 7, 9, 9]);
	});

	it('untrimmed nine-slice retains its full destination extent', () => {
		const bitmap = makeBitmap(false);
		bitmap.width = 92;
		bitmap.height = 92;
		bitmap.scale9Grid = new Rectangle(15, 15, 16, 16);
		const calls = drawBitmap(bitmap).mock.calls;
		expect(calls).toHaveLength(9);
		expect(calls[8].slice(5, 9)).toEqual([77, 77, 15, 15]);
	});

	it.each([0xffffff, 0xff0000])('Canvas preserves scaled trim geometry with tint %s', tint => {
		const bitmap = makeBitmap();
		bitmap.width = 92;
		bitmap.height = 23;
		bitmap.tint = tint;
		const context = {
			drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(), transform: vi.fn(),
			setTransform: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(),
		};
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
		new CanvasRenderer().renderToContext(bitmap, context as unknown as CanvasRenderingContext2D, 0, 0);
		const call = context.drawImage.mock.calls.at(-1)!;
		expect(call.slice(-4)).toEqual([14, 3.5, 62, 15.5]);
	});
});
