import { describe, expect, it } from 'vitest';
import { Matrix } from '../src/blakron/geom/Matrix.js';
import type { WebGLRenderBuffer } from '../src/blakron/player/webgl/WebGLRenderBuffer.js';
import { WebGLVertexArrayObject } from '../src/blakron/player/webgl/WebGLVertexArrayObject.js';

function buffer(): WebGLRenderBuffer {
	return {
		globalAlpha: 1,
		globalTintColor: 0xffffff,
		globalMatrix: new Matrix(),
		offsetX: 0,
		offsetY: 0,
	} as WebGLRenderBuffer;
}

describe('WebGLVertexArrayObject framebuffer quads', () => {
	it.each([
		{ name: 'single-texture', multiTexture: false },
		{ name: 'multi-texture', multiTexture: true },
	])('flips only UV coordinates in $name mode', ({ multiTexture }) => {
		const vao = new WebGLVertexArrayObject();
		vao.setMultiTexture(multiTexture);
		vao.cacheArrays(
			buffer(),
			0,
			0,
			80,
			80,
			10,
			20,
			80,
			80,
			80,
			80,
			undefined,
			undefined,
			undefined,
			undefined,
			0,
			true,
		);

		const stride = multiTexture ? 6 : 5;
		const vertices = vao.getVertices();
		expect([vertices[0], vertices[1], vertices[stride], vertices[stride + 1]]).toEqual([10, 20, 90, 20]);
		expect([
			vertices[stride * 2],
			vertices[stride * 2 + 1],
			vertices[stride * 3],
			vertices[stride * 3 + 1],
		]).toEqual([90, 100, 10, 100]);
		expect([vertices[3], vertices[stride + 3], vertices[stride * 2 + 3], vertices[stride * 3 + 3]]).toEqual([
			1,
			1,
			0,
			0,
		]);
	});
});
