import { describe, expect, it, vi } from 'vitest';
import type { WebGLRenderContext } from '../src/blakron/player/webgl/WebGLRenderContext.js';
import { WebGLRenderBuffer } from '../src/blakron/player/webgl/WebGLRenderBuffer.js';

function createContext(): WebGLRenderContext {
	const gl = {
		TEXTURE_2D: 0x0de1,
		RGBA: 0x1908,
		UNSIGNED_BYTE: 0x1401,
		TEXTURE_MAG_FILTER: 0x2800,
		TEXTURE_MIN_FILTER: 0x2801,
		TEXTURE_WRAP_S: 0x2802,
		TEXTURE_WRAP_T: 0x2803,
		LINEAR: 0x2601,
		CLAMP_TO_EDGE: 0x812f,
		FRAMEBUFFER: 0x8d40,
		COLOR_ATTACHMENT0: 0x8ce0,
		createTexture: vi.fn(() => ({}) as WebGLTexture),
		bindTexture: vi.fn(),
		texImage2D: vi.fn(),
		texParameteri: vi.fn(),
		createFramebuffer: vi.fn(() => ({}) as WebGLFramebuffer),
		bindFramebuffer: vi.fn(),
		framebufferTexture2D: vi.fn(),
		deleteTexture: vi.fn(),
		deleteFramebuffer: vi.fn(),
	} as unknown as WebGLRenderingContext;

	return {
		gl,
		activatedBuffer: undefined,
		pushBuffer: vi.fn(),
		popBuffer: vi.fn(),
		clear: vi.fn(),
		flush: vi.fn(),
		drawCmdManager: { pushResize: vi.fn() },
	} as unknown as WebGLRenderContext;
}

describe('WebGLRenderBuffer pool', () => {
	it('fully resets transient state before reusing a buffer', () => {
		const context = createContext();
		const buffer = new WebGLRenderBuffer(context, 20, 30);
		buffer.globalAlpha = 0.25;
		buffer.globalTintColor = 0x123456;
		buffer.globalMatrix.setTo(2, 3, 4, 5, 6, 7);
		buffer.savedGlobalMatrix.setTo(7, 6, 5, 4, 3, 2);
		buffer.offsetX = 8;
		buffer.offsetY = 9;
		buffer.currentTexture = {} as WebGLTexture;
		buffer.drawCalls = 10;
		buffer.offscreenOriginX = 11;
		buffer.offscreenOriginY = 12;
		buffer.hasOffscreenTransform = true;
		buffer.offscreenInverseTransform.setTo(2, 0, 0, 2, 13, 14);
		buffer.offscreenLocalX = 15;
		buffer.offscreenLocalY = 16;
		buffer.filterPadX = 17;
		buffer.filterPadY = 18;
		buffer.stencilList.push({ x: 1, y: 2, width: 3, height: 4 });
		buffer.stencilHandleCount = 1;
		buffer.scissorState = true;
		buffer.hasScissor = true;

		WebGLRenderBuffer.release(buffer);
		const reused = WebGLRenderBuffer.create(context, 40, 50);

		expect(reused).toBe(buffer);
		expect(reused.globalAlpha).toBe(1);
		expect(reused.globalTintColor).toBe(0xffffff);
		expect(reused.globalMatrix).toMatchObject({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 });
		expect(reused.savedGlobalMatrix).toMatchObject({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 });
		expect(reused.offsetX).toBe(0);
		expect(reused.offsetY).toBe(0);
		expect(reused.currentTexture).toBeUndefined();
		expect(reused.drawCalls).toBe(0);
		expect(reused.offscreenOriginX).toBe(0);
		expect(reused.offscreenOriginY).toBe(0);
		expect(reused.hasOffscreenTransform).toBe(false);
		expect(reused.offscreenInverseTransform).toMatchObject({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 });
		expect(reused.offscreenLocalX).toBe(0);
		expect(reused.offscreenLocalY).toBe(0);
		expect(reused.filterPadX).toBe(0);
		expect(reused.filterPadY).toBe(0);
		expect(reused.stencilList).toEqual([]);
		expect(reused.stencilHandleCount).toBe(0);
		expect(reused.scissorState).toBe(false);
		expect(reused.hasScissor).toBe(false);
	});

	it('does not reuse a framebuffer owned by another WebGL context', () => {
		const firstContext = createContext();
		const secondContext = createContext();
		const first = new WebGLRenderBuffer(firstContext, 20, 30);

		WebGLRenderBuffer.release(first);
		const second = WebGLRenderBuffer.create(secondContext, 20, 30);

		expect(second).not.toBe(first);
		expect(second.context).toBe(secondContext);

		const recovered = WebGLRenderBuffer.create(firstContext, 20, 30);
		expect(recovered).toBe(first);
	});

	it('disposes GPU resources when the pool is full', () => {
		const pooledContexts = Array.from({ length: 6 }, () => createContext());
		for (const context of pooledContexts) {
			WebGLRenderBuffer.release(new WebGLRenderBuffer(context, 20, 30));
		}

		const overflowContext = createContext();
		const overflow = new WebGLRenderBuffer(overflowContext, 20, 30);
		WebGLRenderBuffer.release(overflow);

		expect(overflowContext.gl.deleteTexture).toHaveBeenCalledOnce();
		expect(overflowContext.gl.deleteFramebuffer).toHaveBeenCalledOnce();
		expect(overflowContext.flush).toHaveBeenCalledOnce();
		expect(vi.mocked(overflowContext.flush).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(overflowContext.gl.deleteTexture).mock.invocationCallOrder[0],
		);

		for (const context of pooledContexts) {
			WebGLRenderBuffer.create(context, 20, 30);
		}
	});
});
