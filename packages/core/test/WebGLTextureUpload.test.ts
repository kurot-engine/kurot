import { describe, expect, it, vi } from 'vitest';
import { BitmapData } from '../src/kurot/display/texture/BitmapData.js';
import { WebGLRenderContext } from '../src/kurot/player/webgl/WebGLRenderContext.js';

interface TextureUploadHarness {
	gl: WebGLRenderingContext;
	_trackedBitmapDatas: Set<WeakRef<BitmapData>>;
	_uploadedVersions: WeakMap<BitmapData, number>;
	createTexture(
		source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
		sourcePremultipliedAlpha?: boolean,
	): WebGLTexture;
	getWebGLTexture(bitmapData: BitmapData): WebGLTexture | undefined;
	updateTexture(
		texture: WebGLTexture,
		source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
		sourcePremultipliedAlpha?: boolean,
	): void;
}

function createHarness(): TextureUploadHarness {
	const context = Object.create(WebGLRenderContext.prototype) as TextureUploadHarness;
	context.gl = {
		TEXTURE_2D: 0x0de1,
		RGBA: 0x1908,
		UNSIGNED_BYTE: 0x1401,
		UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
		TEXTURE_MAG_FILTER: 0x2800,
		TEXTURE_MIN_FILTER: 0x2801,
		TEXTURE_WRAP_S: 0x2802,
		TEXTURE_WRAP_T: 0x2803,
		LINEAR: 0x2601,
		CLAMP_TO_EDGE: 0x812f,
		createTexture: vi.fn(() => ({} as WebGLTexture)),
		bindTexture: vi.fn(),
		pixelStorei: vi.fn(),
		texImage2D: vi.fn(),
		texParameteri: vi.fn(),
	} as unknown as WebGLRenderingContext;
	context._trackedBitmapDatas = new Set();
	context._uploadedVersions = new WeakMap();
	return context;
}

describe('WebGL texture upload alpha mode', () => {
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
