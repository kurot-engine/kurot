import { describe, expect, it, vi } from 'vitest';
import { Matrix } from '../src/kurot/geom/Matrix.js';
import { WebGLDrawCmdManager } from '../src/kurot/player/webgl/WebGLDrawCmdManager.js';
import type { WebGLRenderBuffer } from '../src/kurot/player/webgl/WebGLRenderBuffer.js';
import { WebGLRenderContext } from '../src/kurot/player/webgl/WebGLRenderContext.js';
import { WebGLVertexArrayObject } from '../src/kurot/player/webgl/WebGLVertexArrayObject.js';

interface MaskContextHarness {
	_currentBuffer: WebGLRenderBuffer;
	_vao: WebGLVertexArrayObject;
	drawCmdManager: WebGLDrawCmdManager;
	flush: ReturnType<typeof vi.fn>;
	pushMask(x: number, y: number, width: number, height: number): void;
	popMask(): void;
}

function createBuffer(): WebGLRenderBuffer {
	return {
		globalAlpha: 1,
		globalTintColor: 0xffffff,
		globalMatrix: new Matrix(),
		offsetX: 0,
		offsetY: 0,
		stencilList: [{ x: 10, y: 20, width: 30, height: 40 }],
	} as WebGLRenderBuffer;
}

function createHarness(): MaskContextHarness {
	const context = Object.create(WebGLRenderContext.prototype) as MaskContextHarness;
	context._currentBuffer = createBuffer();
	context._vao = new WebGLVertexArrayObject();
	context.drawCmdManager = new WebGLDrawCmdManager();
	context.flush = vi.fn(() => context._vao.clear());
	return context;
}

describe('WebGL mask vertex format', () => {
	it.each(['push', 'pop'] as const)('flushes a multi-texture batch before %s mask geometry', operation => {
		const context = createHarness();
		context._vao.setMultiTexture(true);
		context._vao.cacheArrays(context._currentBuffer, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1);

		if (operation === 'push') {
			context.pushMask(10, 20, 30, 40);
		} else {
			context.popMask();
		}

		expect(context.flush).toHaveBeenCalledOnce();
		expect(context._vao.isMultiTexture()).toBe(false);
		expect(context._vao.getVertices()).toHaveLength(20);
		expect(context.drawCmdManager.drawDataLen).toBe(1);
		expect(context.drawCmdManager.drawData[0]?.count).toBe(2);
	});
});
