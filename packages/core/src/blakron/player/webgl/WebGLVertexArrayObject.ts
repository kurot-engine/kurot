import { premultiplyTint } from './WebGLUtils.js';
import type { WebGLRenderBuffer } from './WebGLRenderBuffer.js';

// ── Single-texture vertex layout ──────────────────────────────────────────────
// x(f32) y(f32) u(f32) v(f32) color(u32) = 5 floats = 20 bytes
const VERT_SIZE = 5;
const VERT_BYTE_SIZE = VERT_SIZE * 4;

// ── Multi-texture vertex layout ───────────────────────────────────────────────
// x(f32) y(f32) u(f32) v(f32) color(u32) textureId(f32) = 6 floats = 24 bytes
export const MULTI_VERT_SIZE = 6;
export const MULTI_VERT_BYTE_SIZE: number = MULTI_VERT_SIZE * 4;

const MAX_QUADS = 2048;
const MAX_VERTS = MAX_QUADS * 4;
const MAX_INDICES = MAX_QUADS * 6;

export class WebGLVertexArrayObject {
	// ── Static fields ─────────────────────────────────────────────────────────

	/** Maximum byte size of the vertex buffer (single-texture layout). */
	public static readonly MAX_VERTEX_BYTES: number = MAX_VERTS * VERT_BYTE_SIZE;

	/** Maximum byte size of the multi-texture vertex buffer. */
	public static readonly MAX_MULTI_VERTEX_BYTES: number = MAX_VERTS * MULTI_VERT_BYTE_SIZE;

	// ── Instance fields ───────────────────────────────────────────────────────

	// Single-texture buffer
	private readonly _buffer: ArrayBuffer;
	private readonly _float32: Float32Array;
	private readonly _uint32: Uint32Array;

	// Multi-texture buffer (larger stride)
	private readonly _multiBuffer: ArrayBuffer;
	private readonly _multiFloat32: Float32Array;
	private readonly _multiUint32: Uint32Array;

	private readonly _indices: Uint16Array;
	private readonly _indicesForMesh: Uint16Array;

	private _vertexIndex = 0;
	private _indexIndex = 0;
	private _hasMesh = false;

	// Whether the current batch uses the multi-texture layout.
	private _isMulti = false;

	public constructor() {
		this._buffer = new ArrayBuffer(MAX_VERTS * VERT_BYTE_SIZE);
		this._float32 = new Float32Array(this._buffer);
		this._uint32 = new Uint32Array(this._buffer);

		this._multiBuffer = new ArrayBuffer(MAX_VERTS * MULTI_VERT_BYTE_SIZE);
		this._multiFloat32 = new Float32Array(this._multiBuffer);
		this._multiUint32 = new Uint32Array(this._multiBuffer);

		this._indices = new Uint16Array(MAX_INDICES);
		this._indicesForMesh = new Uint16Array(MAX_INDICES);

		// Pre-fill quad indices: 0,1,2 / 0,2,3
		for (let i = 0, j = 0; i < MAX_INDICES; i += 6, j += 4) {
			this._indices[i] = j;
			this._indices[i + 1] = j + 1;
			this._indices[i + 2] = j + 2;
			this._indices[i + 3] = j;
			this._indices[i + 4] = j + 2;
			this._indices[i + 5] = j + 3;
		}
	}

	public reachMaxSize(vertexCount = 4, indexCount = 6): boolean {
		return this._vertexIndex > MAX_VERTS - vertexCount || this._indexIndex > MAX_INDICES - indexCount;
	}

	public getVertices(): Float32Array {
		if (this._isMulti) {
			return this._multiFloat32.subarray(0, this._vertexIndex * MULTI_VERT_SIZE);
		}
		return this._float32.subarray(0, this._vertexIndex * VERT_SIZE);
	}

	public getVerticesByteLength(): number {
		if (this._isMulti) {
			return this._vertexIndex * MULTI_VERT_BYTE_SIZE;
		}
		return this._vertexIndex * VERT_BYTE_SIZE;
	}

	public getVerticesBuffer(): ArrayBuffer {
		return this._isMulti ? this._multiBuffer : this._buffer;
	}

	public getIndices(): Uint16Array {
		return this._indices;
	}

	public getMeshIndices(): Uint16Array {
		return this._indicesForMesh.subarray(0, this._indexIndex);
	}

	public changeToMeshIndices(): void {
		if (!this._hasMesh) {
			for (let i = 0; i < this._indexIndex; i++) {
				this._indicesForMesh[i] = this._indices[i];
			}
			this._hasMesh = true;
		}
	}

	public isMesh(): boolean {
		return this._hasMesh;
	}

	public isMultiTexture(): boolean {
		return this._isMulti;
	}

	// Switch this batch to multi-texture mode. Must be called before any cacheArrays.
	public setMultiTexture(enabled: boolean): void {
		this._isMulti = enabled;
	}

	public cacheArrays(
		buffer: WebGLRenderBuffer,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		textureSourceWidth: number,
		textureSourceHeight: number,
		meshUVs?: number[],
		meshVertices?: number[],
		meshIndices?: number[],
		rotated?: boolean,
		textureId = 0,
		flipY = false,
	): void {
		const alpha = Math.min(buffer.globalAlpha, 1.0);
		const tint = buffer.globalTintColor;
		// All Blakron textures are uploaded with UNPACK_PREMULTIPLY_ALPHA_WEBGL=1,
		// so always premultiply the vertex color.
		const packed = premultiplyTint(tint, alpha);

		const m = buffer.globalMatrix;
		let a = m.a,
			b = m.b,
			c = m.c,
			d = m.d;
		let tx = m.tx + buffer.offsetX * a + buffer.offsetY * c;
		let ty = m.ty + buffer.offsetX * b + buffer.offsetY * d;

		if (this._isMulti) {
			this._cacheMulti(
				a,
				b,
				c,
				d,
				tx,
				ty,
				packed,
				textureId,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				destX,
				destY,
				destWidth,
				destHeight,
				textureSourceWidth,
				textureSourceHeight,
				meshUVs,
				meshVertices,
				meshIndices,
				rotated,
				flipY,
			);
		} else {
			this._cacheSingle(
				a,
				b,
				c,
				d,
				tx,
				ty,
				packed,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				destX,
				destY,
				destWidth,
				destHeight,
				textureSourceWidth,
				textureSourceHeight,
				meshUVs,
				meshVertices,
				meshIndices,
				rotated,
				flipY,
			);
		}
	}

	private _cacheSingle(
		a: number,
		b: number,
		c: number,
		d: number,
		tx: number,
		ty: number,
		packed: number,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		textureSourceWidth: number,
		textureSourceHeight: number,
		meshUVs?: number[],
		meshVertices?: number[],
		meshIndices?: number[],
		rotated?: boolean,
		flipY = false,
	): void {
		const f32 = this._float32;
		const u32 = this._uint32;

		if (meshVertices && meshUVs && meshIndices) {
			let idx = this._vertexIndex * VERT_SIZE;
			for (let i = 0, l = meshUVs.length; i < l; i += 2) {
				const x = meshVertices[i],
					y = meshVertices[i + 1];
				const u = meshUVs[i],
					v = meshUVs[i + 1];
				const base = idx + (i / 2) * VERT_SIZE;
				f32[base] = a * x + c * y + tx;
				f32[base + 1] = b * x + d * y + ty;
				if (rotated) {
					f32[base + 2] = (sourceX + (1.0 - v) * sourceHeight) / textureSourceWidth;
					f32[base + 3] = (sourceY + u * sourceWidth) / textureSourceHeight;
				} else {
					f32[base + 2] = (sourceX + u * sourceWidth) / textureSourceWidth;
					f32[base + 3] = (sourceY + v * sourceHeight) / textureSourceHeight;
				}
				u32[base + 4] = packed;
			}
			if (this._hasMesh) {
				for (let i = 0; i < meshIndices.length; i++) {
					this._indicesForMesh[this._indexIndex + i] = meshIndices[i] + this._vertexIndex;
				}
			}
			this._vertexIndex += meshUVs.length / 2;
			this._indexIndex += meshIndices.length;
		} else {
			this._writeQuadSingle(
				f32,
				u32,
				a,
				b,
				c,
				d,
				tx,
				ty,
				packed,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				destX,
				destY,
				destWidth,
				destHeight,
				textureSourceWidth,
				textureSourceHeight,
				rotated,
				flipY,
			);
		}
	}

	private _writeQuadSingle(
		f32: Float32Array,
		u32: Uint32Array,
		a: number,
		b: number,
		c: number,
		d: number,
		tx: number,
		ty: number,
		packed: number,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		tw: number,
		th: number,
		rotated?: boolean,
		flipY = false,
	): void {
		if (destX !== 0 || destY !== 0) {
			tx = destX * a + destY * c + tx;
			ty = destX * b + destY * d + ty;
		}
		const a1 = destWidth / sourceWidth;
		if (a1 !== 1) {
			a *= a1;
			b *= a1;
		}
		const d1 = destHeight / sourceHeight;
		if (d1 !== 1) {
			c *= d1;
			d *= d1;
		}

		const w = sourceWidth,
			h = sourceHeight;
		let sx = sourceX / tw,
			sy = sourceY / th;
		let sw: number, sh: number;
		let idx = this._vertexIndex * VERT_SIZE;

		if (rotated) {
			sw = sourceHeight / tw;
			sh = sourceWidth / th;
			f32[idx] = tx;
			f32[idx + 1] = ty;
			f32[idx + 2] = sw + sx;
			f32[idx + 3] = sy;
			u32[idx + 4] = packed;
			idx += 5;
			f32[idx] = a * w + tx;
			f32[idx + 1] = b * w + ty;
			f32[idx + 2] = sw + sx;
			f32[idx + 3] = sh + sy;
			u32[idx + 4] = packed;
			idx += 5;
			f32[idx] = a * w + c * h + tx;
			f32[idx + 1] = d * h + b * w + ty;
			f32[idx + 2] = sx;
			f32[idx + 3] = sh + sy;
			u32[idx + 4] = packed;
			idx += 5;
			f32[idx] = c * h + tx;
			f32[idx + 1] = d * h + ty;
			f32[idx + 2] = sx;
			f32[idx + 3] = sy;
			u32[idx + 4] = packed;
		} else {
			sw = sourceWidth / tw;
			sh = sourceHeight / th;
			if (flipY) {
				sy += sh;
				sh = -sh;
			}
			f32[idx] = tx;
			f32[idx + 1] = ty;
			f32[idx + 2] = sx;
			f32[idx + 3] = sy;
			u32[idx + 4] = packed;
			idx += 5;
			f32[idx] = a * w + tx;
			f32[idx + 1] = b * w + ty;
			f32[idx + 2] = sw + sx;
			f32[idx + 3] = sy;
			u32[idx + 4] = packed;
			idx += 5;
			f32[idx] = a * w + c * h + tx;
			f32[idx + 1] = d * h + b * w + ty;
			f32[idx + 2] = sw + sx;
			f32[idx + 3] = sh + sy;
			u32[idx + 4] = packed;
			idx += 5;
			f32[idx] = c * h + tx;
			f32[idx + 1] = d * h + ty;
			f32[idx + 2] = sx;
			f32[idx + 3] = sh + sy;
			u32[idx + 4] = packed;
		}

		if (this._hasMesh) {
			const im = this._indicesForMesh;
			const ii = this._indexIndex,
				vi = this._vertexIndex;
			im[ii] = vi;
			im[ii + 1] = vi + 1;
			im[ii + 2] = vi + 2;
			im[ii + 3] = vi;
			im[ii + 4] = vi + 2;
			im[ii + 5] = vi + 3;
		}
		this._vertexIndex += 4;
		this._indexIndex += 6;
	}

	private _cacheMulti(
		a: number,
		b: number,
		c: number,
		d: number,
		tx: number,
		ty: number,
		packed: number,
		textureId: number,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		tw: number,
		th: number,
		meshUVs?: number[],
		meshVertices?: number[],
		meshIndices?: number[],
		rotated?: boolean,
		flipY = false,
	): void {
		const f32 = this._multiFloat32;
		const u32 = this._multiUint32;

		if (meshVertices && meshUVs && meshIndices) {
			let idx = this._vertexIndex * MULTI_VERT_SIZE;
			for (let i = 0, l = meshUVs.length; i < l; i += 2) {
				const x = meshVertices[i],
					y = meshVertices[i + 1];
				const u = meshUVs[i],
					v = meshUVs[i + 1];
				const base = idx + (i / 2) * MULTI_VERT_SIZE;
				f32[base] = a * x + c * y + tx;
				f32[base + 1] = b * x + d * y + ty;
				if (rotated) {
					f32[base + 2] = (sourceX + (1.0 - v) * sourceHeight) / tw;
					f32[base + 3] = (sourceY + u * sourceWidth) / th;
				} else {
					f32[base + 2] = (sourceX + u * sourceWidth) / tw;
					f32[base + 3] = (sourceY + v * sourceHeight) / th;
				}
				u32[base + 4] = packed;
				f32[base + 5] = textureId;
			}
			if (this._hasMesh) {
				for (let i = 0; i < meshIndices.length; i++) {
					this._indicesForMesh[this._indexIndex + i] = meshIndices[i] + this._vertexIndex;
				}
			}
			this._vertexIndex += meshUVs.length / 2;
			this._indexIndex += meshIndices.length;
		} else {
			this._writeQuadMulti(
				f32,
				u32,
				a,
				b,
				c,
				d,
				tx,
				ty,
				packed,
				textureId,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				destX,
				destY,
				destWidth,
				destHeight,
				tw,
				th,
				rotated,
				flipY,
			);
		}
	}

	private _writeQuadMulti(
		f32: Float32Array,
		u32: Uint32Array,
		a: number,
		b: number,
		c: number,
		d: number,
		tx: number,
		ty: number,
		packed: number,
		tid: number,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		tw: number,
		th: number,
		rotated?: boolean,
		flipY = false,
	): void {
		if (destX !== 0 || destY !== 0) {
			tx = destX * a + destY * c + tx;
			ty = destX * b + destY * d + ty;
		}
		const a1 = destWidth / sourceWidth;
		if (a1 !== 1) {
			a *= a1;
			b *= a1;
		}
		const d1 = destHeight / sourceHeight;
		if (d1 !== 1) {
			c *= d1;
			d *= d1;
		}

		const w = sourceWidth,
			h = sourceHeight;
		let sx = sourceX / tw,
			sy = sourceY / th;
		let sw: number, sh: number;
		let idx = this._vertexIndex * MULTI_VERT_SIZE;

		if (rotated) {
			sw = sourceHeight / tw;
			sh = sourceWidth / th;
			f32[idx] = tx;
			f32[idx + 1] = ty;
			f32[idx + 2] = sw + sx;
			f32[idx + 3] = sy;
			u32[idx + 4] = packed;
			f32[idx + 5] = tid;
			idx += 6;
			f32[idx] = a * w + tx;
			f32[idx + 1] = b * w + ty;
			f32[idx + 2] = sw + sx;
			f32[idx + 3] = sh + sy;
			u32[idx + 4] = packed;
			f32[idx + 5] = tid;
			idx += 6;
			f32[idx] = a * w + c * h + tx;
			f32[idx + 1] = d * h + b * w + ty;
			f32[idx + 2] = sx;
			f32[idx + 3] = sh + sy;
			u32[idx + 4] = packed;
			f32[idx + 5] = tid;
			idx += 6;
			f32[idx] = c * h + tx;
			f32[idx + 1] = d * h + ty;
			f32[idx + 2] = sx;
			f32[idx + 3] = sy;
			u32[idx + 4] = packed;
			f32[idx + 5] = tid;
		} else {
			sw = sourceWidth / tw;
			sh = sourceHeight / th;
			if (flipY) {
				sy += sh;
				sh = -sh;
			}
			f32[idx] = tx;
			f32[idx + 1] = ty;
			f32[idx + 2] = sx;
			f32[idx + 3] = sy;
			u32[idx + 4] = packed;
			f32[idx + 5] = tid;
			idx += 6;
			f32[idx] = a * w + tx;
			f32[idx + 1] = b * w + ty;
			f32[idx + 2] = sw + sx;
			f32[idx + 3] = sy;
			u32[idx + 4] = packed;
			f32[idx + 5] = tid;
			idx += 6;
			f32[idx] = a * w + c * h + tx;
			f32[idx + 1] = d * h + b * w + ty;
			f32[idx + 2] = sw + sx;
			f32[idx + 3] = sh + sy;
			u32[idx + 4] = packed;
			f32[idx + 5] = tid;
			idx += 6;
			f32[idx] = c * h + tx;
			f32[idx + 1] = d * h + ty;
			f32[idx + 2] = sx;
			f32[idx + 3] = sh + sy;
			u32[idx + 4] = packed;
			f32[idx + 5] = tid;
		}

		if (this._hasMesh) {
			const im = this._indicesForMesh;
			const ii = this._indexIndex,
				vi = this._vertexIndex;
			im[ii] = vi;
			im[ii + 1] = vi + 1;
			im[ii + 2] = vi + 2;
			im[ii + 3] = vi;
			im[ii + 4] = vi + 2;
			im[ii + 5] = vi + 3;
		}
		this._vertexIndex += 4;
		this._indexIndex += 6;
	}

	public clear(): void {
		this._hasMesh = false;
		this._isMulti = false;
		this._vertexIndex = 0;
		this._indexIndex = 0;
	}
}
