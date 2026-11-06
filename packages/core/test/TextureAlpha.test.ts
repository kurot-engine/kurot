import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BitmapData, hitTestBuffer, RenderTexture, Texture } from '../src/index.js';
import { CanvasBuffer } from '../src/kurot/player/canvas/CanvasBuffer.js';

const drawImage = vi.fn();
const getImageData = vi.fn();
const context = { drawImage, getImageData } as unknown as CanvasRenderingContext2D;

function frame(density = 1, offsetX = 7, offsetY = -3): Texture {
	const source = document.createElement('canvas');
	source.width = source.height = 64;
	const texture = new Texture(density);
	texture.bitmapData = new BitmapData(source);
	texture.initData(20, 30, 6, 4, offsetX, offsetY, 16, 12, 64, 64);
	return texture;
}

beforeEach(() => {
	drawImage.mockReset();
	getImageData.mockReset().mockReturnValue({ data: new Uint8ClampedArray([0, 0, 0, 255]) });
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Texture.hitTestAlpha public contract', () => {
	it.each([0, 1, 127, 255])('tests nonzero original alpha, including %s', alpha => {
		getImageData.mockReturnValue({ data: new Uint8ClampedArray([0, 0, 0, alpha]) });
		expect(frame().hitTestAlpha(0, 0)).toBe(alpha !== 0);
		expect(getImageData).toHaveBeenCalledWith(1, 1, 1, 1);
	});

	it.each([[7, -3], [-5, 9], [0, 0]])('does not apply trim/frame placement again: %s, %s', (x, y) => {
		const texture = frame(1, x, y);
		expect(texture.hitTestAlpha(1.9, -0.9)).toBe(true);
		expect(drawImage).toHaveBeenCalledWith(texture.bitmapData!.source, 21, 30, 1, 1, 1, 1, 1, 1);
	});

	it.each([[-1, 0], [0, -1], [6, 0], [0, 4], [NaN, 0], [0, Infinity], [-Infinity, 0]])(
		'rejects out-of-content or non-finite coordinates (%s, %s) before sampling', (x, y) => {
			expect(frame().hitTestAlpha(x, y)).toBe(false);
			expect(drawImage).not.toHaveBeenCalled();
			expect(getImageData).not.toHaveBeenCalled();
		},
	);

	it('bounds the trimmed region rather than the larger original frame', () => {
		const texture = frame(2);
		expect(texture.hitTestAlpha(2.9, 1.9)).toBe(true);
		expect(drawImage.mock.lastCall?.slice(1)).toEqual([24, 32, 1, 1, 1, 1, 1, 1]);
		expect(texture.hitTestAlpha(3, 0)).toBe(false);
		expect(texture.hitTestAlpha(0, 2)).toBe(false);
	});

	it('truncates logical coordinates before fractional density conversion', () => {
		const texture = frame(1.5);
		texture.hitTestAlpha(1.99, 1.99);
		expect(drawImage.mock.lastCall?.slice(1)).toEqual([21, 31, 1, 1, 1, 1, 1, 1]);
	});

	it('maps upright content coordinates to clockwise-rotated atlas pixels', () => {
		const texture = frame(2);
		texture.rotated = true;
		texture.hitTestAlpha(1.9, 0.9);
		expect(drawImage.mock.lastCall?.slice(1)).toEqual([23, 32, 1, 1, 1, 1, 1, 1]);
	});

	it('returns false for empty, disposed or encoded-only sources', () => {
		const texture = new Texture();
		expect(texture.hitTestAlpha(0, 0)).toBe(false);
		texture.bitmapData = new BitmapData(new ArrayBuffer(4));
		texture.initData(0, 0, 1, 1, 0, 0, 1, 1, 1, 1);
		expect(texture.hitTestAlpha(0, 0)).toBe(false);
		texture.bitmapData.source = undefined;
		expect(texture.hitTestAlpha(0, 0)).toBe(false);
		expect(drawImage).not.toHaveBeenCalled();
	});

	it('reuses the existing sampler and never attaches or disposes borrowed sources', () => {
		const a = frame();
		const b = frame();
		const buffer = hitTestBuffer();
		const create = vi.spyOn(document, 'createElement');
		const dispose = vi.spyOn(Texture.prototype, 'dispose');
		const disposeData = vi.spyOn(BitmapData.prototype, 'dispose');
		const register = vi.spyOn(BitmapData, 'addDisplayObject');
		const capture = vi.spyOn(RenderTexture.prototype, 'drawToTexture');
		for (let i = 0; i < 20; i++) {
			(i % 2 ? a : b).hitTestAlpha(0, 0);
		}
		expect(hitTestBuffer()).toBe(buffer);
		expect(create).not.toHaveBeenCalled();
		expect(dispose).not.toHaveBeenCalled();
		expect(disposeData).not.toHaveBeenCalled();
		expect(register).not.toHaveBeenCalled();
		expect(capture).not.toHaveBeenCalled();
		expect(drawImage.mock.calls[0][0]).toBe(b.bitmapData!.source);
		expect(drawImage.mock.calls[1][0]).toBe(a.bitmapData!.source);
	});

	it.each(['draw', 'read'])('propagates %s errors, resets the shared buffer and permits a fresh sample', step => {
		const texture = frame();
		const error = new Error(`failed to ${step}`);
		const resize = vi.spyOn(CanvasBuffer.prototype, 'resize');
		(step === 'draw' ? drawImage : getImageData).mockImplementationOnce(() => {
			throw error;
		});
		expect(() => texture.hitTestAlpha(0, 0)).toThrow(error);
		expect(resize.mock.calls).toEqual([[3, 3], [3, 3]]);
		expect(texture.hitTestAlpha(0, 0)).toBe(true);
		expect([hitTestBuffer().width, hitTestBuffer().height]).toEqual([3, 3]);
	});
});
