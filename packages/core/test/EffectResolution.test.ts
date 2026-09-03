import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sprite } from '../src/kurot/display/Sprite.js';
import { Filter } from '../src/kurot/filters/Filter.js';
import { FilterPipe } from '../src/kurot/player/pipes/FilterPipe.js';
import { MaskPipe } from '../src/kurot/player/pipes/MaskPipe.js';
import type { WebGLRenderBuffer } from '../src/kurot/player/webgl/WebGLRenderBuffer.js';
import { WebGLRenderBuffer as WGLBuf } from '../src/kurot/player/webgl/WebGLRenderBuffer.js';

afterEach(() => {
	vi.restoreAllMocks();
});

function createParentBuffer(resolution: number): WebGLRenderBuffer {
	return {
		resolution,
		context: {
			maxTextureSize: 4096,
		},
	} as unknown as WebGLRenderBuffer;
}

function createOffscreenBuffer(): WebGLRenderBuffer {
	return {
		resolution: 1,
		context: {
			pushBuffer: vi.fn(),
		},
	} as unknown as WebGLRenderBuffer;
}

describe('effect render resolution', () => {
	it('allocates filter buffers at the parent render resolution', () => {
		const renderable = new Sprite();
		renderable.graphics.beginFill(0xffffff);
		renderable.graphics.drawRect(0, 0, 40, 20);
		const filter = new Filter();
		const instruction = FilterPipe.makePush(renderable, [filter], 0, 0);
		const offscreen = createOffscreenBuffer();
		const create = vi.spyOn(WGLBuf, 'create').mockReturnValue(offscreen);

		const result = new FilterPipe().executePush(instruction, createParentBuffer(2));

		expect(result).toBe(offscreen);
		expect(create).toHaveBeenCalledWith(expect.anything(), 80, 40);
		expect(offscreen.resolution).toBe(2);
	});

	it('allocates display-mask buffers at the parent render resolution', () => {
		const renderable = new Sprite();
		renderable.graphics.beginFill(0xffffff);
		renderable.graphics.drawRect(0, 0, 40, 20);
		const child = new Sprite();
		child.graphics.beginFill(0xffffff);
		child.graphics.drawRect(0, 0, 1, 1);
		renderable.addChild(child);
		const instruction = MaskPipe.makePush(renderable, 0, 0);
		const offscreen = createOffscreenBuffer();
		const create = vi.spyOn(WGLBuf, 'create').mockReturnValue(offscreen);

		const result = new MaskPipe(() => {}).executeClipPush(instruction, createParentBuffer(2));

		expect(result).toBe(offscreen);
		expect(create).toHaveBeenCalledWith(expect.anything(), 80, 40);
		expect(offscreen.resolution).toBe(2);
	});

	it('clamps effect resolution to the maximum texture size', () => {
		const renderable = new Sprite();
		renderable.graphics.beginFill(0xffffff);
		renderable.graphics.drawRect(0, 0, 100, 50);
		const instruction = FilterPipe.makePush(renderable, [new Filter()], 0, 0);
		const parent = createParentBuffer(2);
		(parent.context as { maxTextureSize: number }).maxTextureSize = 120;
		const offscreen = createOffscreenBuffer();
		const create = vi.spyOn(WGLBuf, 'create').mockReturnValue(offscreen);

		new FilterPipe().executePush(instruction, parent);

		expect(create).toHaveBeenCalledWith(expect.anything(), 120, 60);
		expect(offscreen.resolution).toBeCloseTo(1.2);
	});
});
