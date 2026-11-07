import { describe, expect, it, vi } from 'vitest';
import { captureBackdrop } from '../src/kurot/player/webgl/backdrop-capture.js';
import type { WebGLRenderContext } from '../src/kurot/player/webgl/WebGLRenderContext.js';
import type { WebGLRenderBuffer } from '../src/kurot/player/webgl/WebGLRenderBuffer.js';
import type { WebGLRenderTarget } from '../src/kurot/player/webgl/WebGLRenderTarget.js';
import type { WebGLFilterTargetPool } from '../src/kurot/player/webgl/WebGLFilterTargetPool.js';

function fixture(webgl2: boolean, antialias: boolean): {
	context: WebGLRenderContext;
	parent: WebGLRenderBuffer;
	pool: WebGLFilterTargetPool;
} {
	const context = {
		isWebGL2: webgl2,
		gl: {
			READ_FRAMEBUFFER: 1, TEXTURE0: 2, TEXTURE_2D: 3, COLOR_BUFFER_BIT: 4, LINEAR: 5,
			getContextAttributes: () => ({ antialias }),
			bindFramebuffer: vi.fn(), activeTexture: vi.fn(), bindTexture: vi.fn(),
			blitFramebuffer: vi.fn(), copyTexSubImage2D: vi.fn(),
		},
	} as unknown as WebGLRenderContext;
	const parent = {
		width: 200, height: 100,
		rootRenderTarget: { useFrameBuffer: true, activate: vi.fn() },
	} as unknown as WebGLRenderBuffer;
	const pool = {
		acquire: vi.fn((width: number, height: number): WebGLRenderTarget => ({
			width, height, texture: {} as WebGLTexture, activate: vi.fn(),
		}) as unknown as WebGLRenderTarget),
		release: vi.fn(),
	} as unknown as WebGLFilterTargetPool;
	return { context, parent, pool };
}

describe('GPU backdrop capture ownership and sampling', () => {
	it('samples existing parent textures without copying or allocating a staging image', () => {
		const { context, parent, pool } = fixture(true, true);
		parent.rootRenderTarget.texture = {} as WebGLTexture;
		const result = captureBackdrop(context, pool, parent, { left: 10, top: 20, right: 90, bottom: 60 }, 0.25);
		expect(result).toEqual({ source: parent.rootRenderTarget, area: [0, 0, 200, 100], borrowed: true });
		expect(pool.acquire).not.toHaveBeenCalled();
		expect(context.gl.copyTexSubImage2D).not.toHaveBeenCalled();
	});

	it('downsamples single-sample WebGL 2 capture during the framebuffer blit', () => {
		const { context, parent, pool } = fixture(true, false);
		const result = captureBackdrop(context, pool, parent, { left: 10, top: 20, right: 90, bottom: 60 }, 0.25);
		expect(pool.acquire).toHaveBeenCalledWith(20, 10);
		expect((context.gl as WebGL2RenderingContext).blitFramebuffer).toHaveBeenCalledWith(10, 40, 90, 80, 0, 0, 20, 10, 4, 5);
		expect(result.area).toEqual([10, 20, 80, 40]);
		expect(result.borrowed).toBe(false);
	});

	it.each([[false, true], [false, false], [true, true]])(
		'keeps required native copy dimensions for webgl2=%s / antialias=%s', (webgl2, antialias) => {
			const { context, parent, pool } = fixture(webgl2, antialias);
			captureBackdrop(context, pool, parent, { left: 10, top: 20, right: 90, bottom: 60 }, 0.25);
			expect(pool.acquire).toHaveBeenCalledWith(80, 40);
			expect(context.gl.copyTexSubImage2D).toHaveBeenCalledWith(3, 0, 0, 0, 10, 40, 80, 40);
		});

	it('returns owned staging resources when the GPU copy throws', () => {
		const { context, parent, pool } = fixture(true, false);
		vi.mocked((context.gl as WebGL2RenderingContext).blitFramebuffer).mockImplementation(() => {
			throw new Error('capture failed');
		});
		expect(() => captureBackdrop(context, pool, parent, { left: 0, top: 0, right: 80, bottom: 40 }, 0.5)).toThrow('capture failed');
		expect(pool.release).toHaveBeenCalledOnce();
	});
});
