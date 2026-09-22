import { WebGLVertexArrayObject } from './WebGLVertexArrayObject.js';

interface MeshChunk {
	vertices: number[];
	uvs: number[];
	indices: number[];
}

/**
 * Preserves triangle order while remapping each batch to local Uint16 indices.
 */
export function* splitMesh(
	vertices: readonly number[],
	uvs: readonly number[],
	indices: readonly number[],
): Generator<MeshChunk> {
	let chunk: MeshChunk = { vertices: [], uvs: [], indices: [] };
	const mapped = new Map<number, number>();
	for (let i = 0; i + 2 < indices.length; i += 3) {
		const triangle = [indices[i], indices[i + 1], indices[i + 2]];
		const added = new Set(triangle.filter(index => !mapped.has(index))).size;
		if (
			mapped.size + added > WebGLVertexArrayObject.MAX_VERTICES ||
			chunk.indices.length + 3 > WebGLVertexArrayObject.MAX_INDICES
		) {
			yield chunk;
			chunk = { vertices: [], uvs: [], indices: [] };
			mapped.clear();
		}
		for (const index of triangle) {
			let local = mapped.get(index);
			if (local === undefined) {
				local = mapped.size;
				mapped.set(index, local);
				chunk.vertices.push(vertices[index * 2], vertices[index * 2 + 1]);
				chunk.uvs.push(uvs[index * 2], uvs[index * 2 + 1]);
			}
			chunk.indices.push(local);
		}
	}
	if (chunk.indices.length) yield chunk;
}
