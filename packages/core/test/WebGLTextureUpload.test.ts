import { afterEach, describe, expect, it, vi } from 'vitest';
import { BitmapData } from '../src/kurot/display/texture/BitmapData.js';
import { createTextureUploadHarness as createHarness } from './helpers/texture-upload-harness.js';

class DecodedBitmap {
	public readonly width = 4;
	public readonly height = 2;
	public readonly close = vi.fn();
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('WebGL texture upload alpha mode', () => {
	it('normalizes undeclared ImageBitmap uploads and releases scratch pixels without closing the source', () => {
		vi.stubGlobal('ImageBitmap', DecodedBitmap);
		const context = createHarness();
		const source = new DecodedBitmap() as ImageBitmap;
		const canvas = document.createElement('canvas');
		const drawImage = vi.fn();
		vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
		vi.spyOn(document, 'createElement').mockReturnValue(canvas);
		let uploadedSize: number[] = [];
		vi.mocked(context.gl.texImage2D).mockImplementation(() => {
			uploadedSize = [canvas.width, canvas.height];
		});

		context.createTexture(source);
		context.updateTexture({} as WebGLTexture, source);

		expect(drawImage).toHaveBeenCalledTimes(2);
		expect(drawImage).toHaveBeenCalledWith(source, 0, 0);
		expect(context.gl.texImage2D).toHaveBeenLastCalledWith(0x0de1, 0, 0x1908, 0x1908, 0x1401, canvas);
		expect(uploadedSize).toEqual([4, 2]);
		expect([canvas.width, canvas.height]).toEqual([0, 0]);
		expect(source.close).not.toHaveBeenCalled();
	});

	it('keeps explicitly premultiplied ImageBitmap pixels on the direct path', () => {
		vi.stubGlobal('ImageBitmap', DecodedBitmap);
		const context = createHarness();
		const source = new DecodedBitmap() as ImageBitmap;
		const scratch = vi.spyOn(document, 'createElement');

		context.createTexture(source, true);
		context.updateTexture({} as WebGLTexture, source, true);

		expect(scratch).not.toHaveBeenCalled();
		expect(context.gl.texImage2D).toHaveBeenLastCalledWith(0x0de1, 0, 0x1908, 0x1908, 0x1401, source);
	});

	it('reclaims the failed upload and scratch buffer when ImageBitmap conversion throws', () => {
		vi.stubGlobal('ImageBitmap', DecodedBitmap);
		const context = createHarness();
		const source = new DecodedBitmap() as ImageBitmap;
		const canvas = document.createElement('canvas');
		vi.spyOn(canvas, 'getContext').mockReturnValue({
			drawImage: () => {
				throw new Error('decode failure');
			},
		} as unknown as CanvasRenderingContext2D);
		vi.spyOn(document, 'createElement').mockReturnValue(canvas);

		expect(() => context.createTexture(source)).toThrow('decode failure');
		expect(context.gl.deleteTexture).toHaveBeenCalledOnce();
		expect(context.gl.texImage2D).not.toHaveBeenCalled();
		expect([canvas.width, canvas.height]).toEqual([0, 0]);
	});
	it('prunes dead weak registrations on the next upload', () => {
		const context = createHarness();
		context._trackedBitmapDatas.add({ deref: () => undefined, [Symbol.toStringTag]: 'WeakRef' });
		context.getWebGLTexture(new BitmapData(document.createElement('canvas')));
		expect(context._trackedBitmapDatas.size).toBe(1);
	});

	it('explicit pixel disposal releases its upload once and clears bookkeeping', () => {
		const context = createHarness();
		const data = new BitmapData(document.createElement('canvas'));
		const texture = context.getWebGLTexture(data);
		data.dispose();
		data.dispose();
		expect(context.gl.deleteTexture).toHaveBeenCalledExactlyOnceWith(texture);
		expect(context._uploadedVersions.has(data)).toBe(false);
		expect(context._trackedBitmapDatas.size).toBe(0);
		expect(data.webGLTexture).toBeUndefined();
	});

	it('disposes the current upload after context restoration replaces its handle', () => {
		const context = createHarness();
		const data = new BitmapData(document.createElement('canvas'));
		const old = context.getWebGLTexture(data);
		data.webGLTexture = undefined;
		const restored = context.getWebGLTexture(data);
		expect(context._trackedBitmapDatas.size).toBe(1);
		data.dispose();
		expect(restored).not.toBe(old);
		expect(context.gl.deleteTexture).toHaveBeenCalledExactlyOnceWith(restored);
	});
	it('premultiplies straight-alpha sources by default', () => {
		const context = createHarness();

		context.createTexture({} as HTMLImageElement);

		expect(context.gl.pixelStorei).toHaveBeenCalledWith(
			context.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
			1,
		);
	});

	it('preserves sources that are already premultiplied', () => {
		const context = createHarness();

		context.createTexture({} as HTMLImageElement, true);

		expect(context.gl.pixelStorei).toHaveBeenCalledWith(
			context.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
			0,
		);
	});

	it('sets the alpha mode explicitly when updating a texture', () => {
		const context = createHarness();
		const texture = {} as WebGLTexture;
		const source = {} as HTMLImageElement;

		context.updateTexture(texture, source, true);
		context.updateTexture(texture, source, false);

		expect(context.gl.pixelStorei).toHaveBeenNthCalledWith(
			1,
			context.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
			0,
		);
		expect(context.gl.pixelStorei).toHaveBeenNthCalledWith(
			2,
			context.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
			1,
		);
	});

	it('re-uploads invalidated canvas textures without allocating a new texture', () => {
		const context = createHarness();
		const texture = {} as WebGLTexture;
		const canvas = document.createElement('canvas');
		const bitmapData = new BitmapData(canvas);
		context.createTexture = vi.fn(() => texture);
		context.updateTexture = vi.fn();

		expect(context.getWebGLTexture(bitmapData)).toBe(texture);
		BitmapData.invalidate(bitmapData);
		expect(context.getWebGLTexture(bitmapData)).toBe(texture);

		expect(context.createTexture).toHaveBeenCalledTimes(1);
		expect(context.updateTexture).toHaveBeenCalledOnce();
		expect(context.updateTexture).toHaveBeenCalledWith(texture, canvas, false);
	});
});
