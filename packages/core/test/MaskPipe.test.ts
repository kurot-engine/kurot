import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sprite } from '../src/blakron/display/Sprite.js';
import type { WebGLRenderBuffer } from '../src/blakron/player/webgl/WebGLRenderBuffer.js';
import { WebGLRenderBuffer as WGLBuf } from '../src/blakron/player/webgl/WebGLRenderBuffer.js';
import { MaskPipe } from '../src/blakron/player/webgl/pipes/MaskPipe.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('MaskPipe framebuffer lifecycle', () => {
	it('finishes the composite before releasing its sampled display buffer', () => {
		const renderable = new Sprite();
		renderable.graphics.beginFill(0xffffff);
		renderable.graphics.drawRect(0, 0, 10, 10);
		const push = MaskPipe.makePush(renderable, 0, 0);
		const pop = MaskPipe.makePop(renderable, push);
		const drawFramebufferTexture = vi.fn();
		const flush = vi.fn();
		const release = vi.spyOn(WGLBuf, 'release').mockImplementation(() => {});
		const buffer = {
			context: {
				currentBlendMode: 'source-over',
				drawFramebufferTexture,
				flush,
				popMask: vi.fn(),
				pushMask: vi.fn(),
				setGlobalCompositeOperation: vi.fn(),
			},
		} as unknown as WebGLRenderBuffer;
		const displayBuffer = {
			context: { popBuffer: vi.fn() },
			rootRenderTarget: { width: 10, height: 10, texture: {} as WebGLTexture },
		} as unknown as WebGLRenderBuffer;
		const pipe = new MaskPipe(() => {});

		pipe.executeClipPop(pop, buffer, displayBuffer);

		expect(drawFramebufferTexture).toHaveBeenCalledOnce();
		expect(flush).toHaveBeenCalledOnce();
		expect(release).toHaveBeenCalledWith(displayBuffer);
		expect(drawFramebufferTexture.mock.invocationCallOrder[0]).toBeLessThan(flush.mock.invocationCallOrder[0]);
		expect(flush.mock.invocationCallOrder[0]).toBeLessThan(release.mock.invocationCallOrder[0]);
	});
});
