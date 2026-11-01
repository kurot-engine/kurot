import { vi } from 'vitest';
import { BitmapData } from '../../src/kurot/display/texture/BitmapData.js';
import { WebGLRenderContext } from '../../src/kurot/player/webgl/WebGLRenderContext.js';

export interface TextureUploadHarness {
	gl: WebGLRenderingContext;
	_trackedBitmapDatas: Set<WeakRef<BitmapData>>;
	_bitmapDataRefs: WeakMap<BitmapData, WeakRef<BitmapData>>;
	_bitmapDataSweep?: Iterator<WeakRef<BitmapData>, undefined>;
	_uploadedVersions: WeakMap<BitmapData, number>;
	createTexture(
		source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
		sourcePremultipliedAlpha?: boolean,
	): WebGLTexture;
	getWebGLTexture(bitmapData: BitmapData): WebGLTexture | undefined;
	updateTexture(
		texture: WebGLTexture,
		source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
		sourcePremultipliedAlpha?: boolean,
	): void;
}

export function createTextureUploadHarness(): TextureUploadHarness {
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
		deleteTexture: vi.fn(),
	} as unknown as WebGLRenderingContext;
	context._trackedBitmapDatas = new Set();
	context._bitmapDataRefs = new WeakMap();
	context._uploadedVersions = new WeakMap();
	return context;
}
