import type { Mesh } from '@kurot/core';
import { dragonBones } from '../runtime/dragonbones.js';

function floatOffset(value: number): number {
	return value < 0 ? value + 65536 : value;
}

export function initializeMesh(mesh: Mesh, geometry: dragonBones.GeometryData, scale: number): void {
	const { intArray, floatArray } = geometry.data;
	const count = intArray[geometry.offset + dragonBones.BinaryOffset.GeometryVertexCount];
	const triangles = intArray[geometry.offset + dragonBones.BinaryOffset.GeometryTriangleCount];
	const offset = floatOffset(intArray[geometry.offset + dragonBones.BinaryOffset.GeometryFloatOffset]);
	mesh.vertices.length = count * 2;
	mesh.uvs.length = count * 2;
	mesh.indices.length = triangles * 3;
	for (let i = 0; i < count * 2; i++) {
		mesh.vertices[i] = floatArray[offset + i] * scale;
		mesh.uvs[i] = floatArray[offset + count * 2 + i];
	}
	for (let i = 0; i < triangles * 3; i++) {
		mesh.indices[i] = intArray[geometry.offset + dragonBones.BinaryOffset.GeometryVertexIndices + i];
	}
	mesh.updateVertices();
}

export function deformMesh(
	mesh: Mesh,
	geometry: dragonBones.GeometryData,
	bones: Readonly<dragonBones.Slot['_geometryBones']>,
	parent: dragonBones.Bone,
	deform: readonly number[],
	scale: number,
): void {
	const { intArray, floatArray } = geometry.data;
	const count = intArray[geometry.offset + dragonBones.BinaryOffset.GeometryVertexCount];
	const hasDeform = deform.length > 0 && geometry.inheritDeform;
	const weight = geometry.weight;
	if (weight) {
		let boneOffset = weight.offset + dragonBones.BinaryOffset.WeigthBoneIndices + bones.length;
		let valueOffset = floatOffset(intArray[weight.offset + dragonBones.BinaryOffset.WeigthFloatOffset]);
		let deformOffset = 0;
		for (let i = 0; i < count; i++) {
			const boneCount = intArray[boneOffset++];
			let x = 0;
			let y = 0;
			for (let j = 0; j < boneCount; j++) {
				const bone = bones[intArray[boneOffset++]];
				const contribution = floatArray[valueOffset++];
				let localX = floatArray[valueOffset++] * scale;
				let localY = floatArray[valueOffset++] * scale;
				if (hasDeform) {
					localX += deform[deformOffset++];
					localY += deform[deformOffset++];
				}
				if (!bone) continue;
				const m = bone.globalTransformMatrix;
				x += (m.a * localX + m.c * localY + m.tx) * contribution;
				y += (m.b * localX + m.d * localY + m.ty) * contribution;
			}
			mesh.vertices[i * 2] = x;
			mesh.vertices[i * 2 + 1] = y;
		}
	} else {
		const offset = floatOffset(intArray[geometry.offset + dragonBones.BinaryOffset.GeometryFloatOffset]);
		for (let i = 0; i < count * 2; i += 2) {
			const x = floatArray[offset + i] * scale + (hasDeform ? deform[i] : 0);
			const y = floatArray[offset + i + 1] * scale + (hasDeform ? deform[i + 1] : 0);
			if (parent instanceof dragonBones.Surface) {
				const m = parent._getGlobalTransformMatrix(x, y);
				mesh.vertices[i] = m.a * x + m.c * y + m.tx;
				mesh.vertices[i + 1] = m.b * x + m.d * y + m.ty;
			} else {
				mesh.vertices[i] = x;
				mesh.vertices[i + 1] = y;
			}
		}
	}
	mesh.updateVertices();
}
