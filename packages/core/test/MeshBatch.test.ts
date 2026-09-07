import { describe, expect, it } from 'vitest';
import { splitMesh } from '../src/kurot/player/webgl/split-mesh.js';
import { WebGLVertexArrayObject } from '../src/kurot/player/webgl/WebGLVertexArrayObject.js';

describe('mesh batch splitting', () => {
	it('preserves vertex/UV correspondence and triangle order beyond Uint16 source indices', () => {
		const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
		for (let i = 0; i < 66000; i++) {
			vertices.push(i, -i); uvs.push(i / 66000, 1); indices.push(i);
		}
		let cursor = 0;
		for (const chunk of splitMesh(vertices, uvs, indices)) {
			expect(chunk.vertices.length / 2).toBeLessThanOrEqual(WebGLVertexArrayObject.MAX_VERTICES);
			expect(chunk.indices.length).toBeLessThanOrEqual(WebGLVertexArrayObject.MAX_INDICES);
			expect(chunk.indices.length % 3).toBe(0);
			for (const local of chunk.indices) {
				expect(chunk.vertices.slice(local * 2, local * 2 + 2)).toEqual([cursor, -cursor]);
				expect(chunk.uvs[local * 2]).toBe(cursor / 66000);
				cursor++;
			}
		}
		expect(cursor).toBe(indices.length);
	});

	it('splits index-heavy geometry while retaining shared vertices', () => {
		const indices = Array.from({ length: 15000 }, (_, i) => i % 3);
		const chunks = [...splitMesh([0, 0, 10, 0, 0, 10], [0, 0, 1, 0, 0, 1], indices)];
		expect(chunks).toHaveLength(2);
		expect(chunks.map(chunk => chunk.indices.length)).toEqual([12288, 2712]);
		for (const chunk of chunks) expect(chunk.vertices).toEqual([0, 0, 10, 0, 0, 10]);
	});
});
