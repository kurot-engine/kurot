import { describe, expect, it, vi } from 'vitest';
import { WebGLRenderContext } from '../src/blakron/player/webgl/WebGLRenderContext.js';

interface BlurFramebufferEntry {
	texture: WebGLTexture;
	fbo: WebGLFramebuffer;
	byteSize: number;
}

interface BlurPoolHarness {
	gl: WebGLRenderingContext;
	_blurFboPool: Map<string, BlurFramebufferEntry[]>;
	_blurFboPoolSize: number;
	_blurFboPoolBytes: number;
	_takeBlurFramebuffer(key: string): BlurFramebufferEntry | undefined;
	_returnBlurFramebuffer(key: string, entry: BlurFramebufferEntry): void;
}

function createHarness(): BlurPoolHarness {
	const context = Object.create(WebGLRenderContext.prototype) as BlurPoolHarness;
	context.gl = {
		deleteTexture: vi.fn(),
		deleteFramebuffer: vi.fn(),
	} as unknown as WebGLRenderingContext;
	context._blurFboPool = new Map();
	context._blurFboPoolSize = 0;
	context._blurFboPoolBytes = 0;
	return context;
}

describe('WebGL blur framebuffer pool', () => {
	it('caps retained GPU resources and disposes the oldest entry', () => {
		const context = createHarness();
		const entries: BlurFramebufferEntry[] = [];
		for (let i = 0; i < 17; i++) {
			const entry = {
				texture: { index: i } as unknown as WebGLTexture,
				fbo: { index: i } as unknown as WebGLFramebuffer,
				byteSize: 4,
			};
			entries.push(entry);
			context._returnBlurFramebuffer(`${i}x1`, entry);
		}

		expect(context._blurFboPoolSize).toBe(16);
		expect(context._blurFboPoolBytes).toBe(64);
		expect(context._blurFboPool.has('0x1')).toBe(false);
		expect(context.gl.deleteTexture).toHaveBeenCalledWith(entries[0].texture);
		expect(context.gl.deleteFramebuffer).toHaveBeenCalledWith(entries[0].fbo);
	});

	it('removes empty size buckets when acquiring an entry', () => {
		const context = createHarness();
		const entry = {
			texture: {} as WebGLTexture,
			fbo: {} as WebGLFramebuffer,
			byteSize: 20 * 30 * 4,
		};
		context._returnBlurFramebuffer('20x30', entry);

		expect(context._takeBlurFramebuffer('20x30')).toBe(entry);
		expect(context._blurFboPoolSize).toBe(0);
		expect(context._blurFboPoolBytes).toBe(0);
		expect(context._blurFboPool.has('20x30')).toBe(false);
	});

	it('keeps retained textures within the memory budget', () => {
		const context = createHarness();
		const large = {
			texture: {} as WebGLTexture,
			fbo: {} as WebGLFramebuffer,
			byteSize: 64 * 1024 * 1024,
		};
		const replacement = {
			texture: {} as WebGLTexture,
			fbo: {} as WebGLFramebuffer,
			byteSize: 4,
		};
		context._returnBlurFramebuffer('large', large);
		context._returnBlurFramebuffer('small', replacement);

		expect(context._blurFboPoolSize).toBe(1);
		expect(context._blurFboPoolBytes).toBe(4);
		expect(context._blurFboPool.has('large')).toBe(false);
		expect(context.gl.deleteTexture).toHaveBeenCalledWith(large.texture);
		expect(context.gl.deleteFramebuffer).toHaveBeenCalledWith(large.fbo);
	});
});
