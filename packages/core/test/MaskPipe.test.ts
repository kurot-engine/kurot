import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sprite } from '../src/kurot/display/Sprite.js';
import { Matrix } from '../src/kurot/geom/Matrix.js';
import { Rectangle } from '../src/kurot/geom/Rectangle.js';
import type { WebGLRenderBuffer } from '../src/kurot/player/webgl/WebGLRenderBuffer.js';
import { WebGLRenderBuffer as WGLBuf } from '../src/kurot/player/webgl/WebGLRenderBuffer.js';
import { MaskPipe } from '../src/kurot/player/pipes/MaskPipe.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('MaskPipe viewport clipping', () => {
	it.each([
		{ name: 'nested clip', nested: true, matrix: new Matrix(2, 0, 0, 2, 100, 120) },
		{ name: 'rotated clip', nested: false, matrix: new Matrix(0, 2, -2, 0, 100, 120) },
	])('keeps the $name fixed while its content scrolls', ({ nested, matrix }) => {
		const viewport = new Sprite();
		const pushMask = vi.fn();
		const enableScissor = vi.fn();
		const buffer = {
			globalMatrix: matrix,
			hasScissor: nested,
			context: { pushMask, enableScissor },
		} as unknown as WebGLRenderBuffer;
		const pipe = new MaskPipe(() => {});

		for (const offset of [0, 60, 120, -20]) {
			viewport.scrollRect = new Rectangle(5, offset, 400, 730);
			const push = MaskPipe.makePush(viewport, 0, 0);
			expect(pipe.executeScrollRectPush(push, buffer)).toBe(false);
			expect(pushMask).toHaveBeenLastCalledWith(0, 0, 400, 730);
			MaskPipe.releasePush(push);
		}
		expect(enableScissor).not.toHaveBeenCalled();
	});

	it.each([
		{ name: 'fractional viewport', matrix: new Matrix(0.971875, 0, 0, 0.9, 58.3125, 20.7), expected: [58, 259, 226, 44] },
		{ name: 'fractional translation', matrix: new Matrix(1, 0, 0, 1, 60.7, 20.7), expected: [60, 254, 233, 49] },
		{ name: 'reflected viewport', matrix: new Matrix(-0.75, 0, 0, -0.9, 250.8, 100.3), expected: [76, 222, 175, 44] },
	])('quantizes the $name edges without shrinking their pixel coverage', ({ matrix, expected }) => {
		const viewport = new Sprite();
		viewport.scrollRect = new Rectangle(13, 27, 232, 48);
		const enableScissor = vi.fn();
		const buffer = {
			globalMatrix: matrix, height: 323, hasScissor: false,
			context: { enableScissor },
		} as unknown as WebGLRenderBuffer;
		const pipe = new MaskPipe(() => {});
		const push = MaskPipe.makePush(viewport, 0, 0);

		expect(pipe.executeScrollRectPush(push, buffer)).toBe(true);
		expect(enableScissor).toHaveBeenCalledWith(...expected);
		MaskPipe.releasePush(push);
	});

	it('preserves the local origin of a rectangular mask inside an outer clip', () => {
		const renderable = new Sprite();
		renderable.mask = new Rectangle(15, 25, 40, 70);
		const pushMask = vi.fn();
		const buffer = {
			globalMatrix: new Matrix(),
			hasScissor: true,
			context: { pushMask },
		} as unknown as WebGLRenderBuffer;
		const pipe = new MaskPipe(() => {});
		const push = MaskPipe.makePush(renderable, 0, 0);

		expect(pipe.executeScrollRectPush(push, buffer)).toBe(false);
		expect(pushMask).toHaveBeenCalledWith(15, 25, 40, 70);
		MaskPipe.releasePush(push);
	});
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
