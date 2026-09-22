import type { FilterSampler } from './WebGLFilterSystem.js';
import type { BitmapData } from '../../display/texture/BitmapData.js';
import type { CustomFilter } from '../../filters/CustomFilter.js';
import type { WebGLProgram } from './WebGLProgram.js';
import type { WebGLRenderContext } from './WebGLRenderContext.js';

interface TextureEntry {
	texture: WebGLTexture;
	version: number;
	token: object;
}

/**
 * Context-owned auxiliary textures with independent sampling state.
 */
export class WebGLFilterTextures {
	private _cache = new WeakMap<BitmapData, Map<boolean, TextureEntry>>();
	private readonly _entries = new Set<WeakRef<TextureEntry>>();
	private readonly _maxUnits: number;

	public constructor(private readonly _context: WebGLRenderContext) {
		this._maxUnits = _context.gl.getParameter(_context.gl.MAX_TEXTURE_IMAGE_UNITS) as number;
	}

	public bind(program: WebGLProgram, filter: CustomFilter, inputs: Record<string, FilterSampler> = {}): void {
		const gl = this._context.gl;
		for (const name of Object.keys({ ...filter.textures, ...inputs })) {
			if (
				[
					'uSampler',
					'projectionVector',
					'uTextureSize',
					'uInputSize',
					'uInputClamp',
					'uOutputSize',
					'uResolution',
				].includes(name) ||
				(inputs[name] && filter.textures[name])
			)
				throw new Error(`Conflicting filter pass texture ${name}.`);
		}
		const resources = Object.keys({ ...filter.textures, ...inputs }).filter(
			name => program.uniforms[name] || program.uniforms[`${name}Matrix`] || program.uniforms[`${name}Clamp`],
		);
		if (resources.length >= this._maxUnits)
			throw new Error('CustomFilter exceeds available texture units (including uSampler).');
		try {
			for (let i = 0; i < resources.length; i++) {
				const name = resources[i];
				for (const [suffix, type] of [
					['Matrix', gl.FLOAT_MAT3],
					['Clamp', gl.FLOAT_VEC4],
				] as const) {
					const info = program.uniformInfo[`${name}${suffix}`];
					if (info && (info.type !== type || info.size !== 1)) {
						throw new Error(`CustomFilter ${name}${suffix} has an invalid automatic uniform type.`);
					}
				}
				if (
					program.uniformInfo[name] &&
					(program.uniformInfo[name].type !== gl.SAMPLER_2D || program.uniformInfo[name].size !== 1)
				) {
					throw new Error(`CustomFilter texture ${name} requires a scalar sampler2D.`);
				}
				const borrowed = inputs[name];
				if (borrowed) {
					gl.activeTexture(gl.TEXTURE0 + i + 1);
					gl.bindTexture(gl.TEXTURE_2D, borrowed.texture);
					if (program.uniforms[name]) {
						gl.uniform1i(program.uniforms[name], i + 1);
					}
					const matrix = program.uniforms[`${name}Matrix`];
					if (matrix) {
						gl.uniformMatrix3fv(matrix, false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));
					}
					const clamp = program.uniforms[`${name}Clamp`];
					if (clamp) {
						gl.uniform4f(
							clamp,
							0.5 / borrowed.width,
							0.5 / borrowed.height,
							1 - 0.5 / borrowed.width,
							1 - 0.5 / borrowed.height,
						);
					}
					continue;
				}
				const resource = filter.textures[name];
				const data = resource.source;
				const source = data.source;
				if (!source || source instanceof ArrayBuffer)
					throw new Error(`CustomFilter texture ${name} has no image source.`);
				if (
					data.width <= 0 ||
					data.height <= 0 ||
					data.width > this._context.maxTextureSize ||
					data.height > this._context.maxTextureSize
				) {
					throw new Error(`CustomFilter texture ${name} has invalid dimensions.`);
				}
				const transform = resource.transform ?? [1, 0, 0, -1, 0, 1];
				if (transform.length !== 6 || transform.some(n => !Number.isFinite(n))) {
					throw new Error(`CustomFilter texture ${name} requires a finite affine transform.`);
				}
				gl.activeTexture(gl.TEXTURE0 + i + 1);
				let variants = this._cache.get(data);
				if (!variants) {
					variants = new Map();
					this._cache.set(data, variants);
				}
				const smoothing = resource.smoothing ?? true;
				let entry = variants.get(smoothing);
				if (!entry) {
					const texture = this._context.createTexture(source, data.premultipliedAlpha);
					entry = { texture, version: data.contentVersion, token: {} };
					variants.set(smoothing, entry);
					for (const ref of this._entries) {
						if (!ref.deref()) {
							this._entries.delete(ref);
						}
					}
					this._entries.add(new WeakRef(entry));
					this._context.registerTextureForGC(entry, texture, entry.token);
					const sampling = smoothing ? gl.LINEAR : gl.NEAREST;
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, sampling);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, sampling);
				} else if (entry.version !== data.contentVersion) {
					this._context.updateTexture(entry.texture, source, data.premultipliedAlpha);
					entry.version = data.contentVersion;
				}
				gl.bindTexture(gl.TEXTURE_2D, entry.texture);
				if (program.uniforms[name]) {
					gl.uniform1i(program.uniforms[name], i + 1);
				}
				const matrix = program.uniforms[`${name}Matrix`];
				if (matrix) {
					const [a, b, c, d, tx, ty] = transform;
					gl.uniformMatrix3fv(matrix, false, new Float32Array([a, b, 0, c, d, 0, tx, ty, 1]));
				}
				const clamp = program.uniforms[`${name}Clamp`];
				if (clamp) {
					gl.uniform4f(
						clamp,
						0.5 / data.width,
						0.5 / data.height,
						1 - 0.5 / data.width,
						1 - 0.5 / data.height,
					);
				}
			}
		} finally {
			gl.activeTexture(gl.TEXTURE0);
		}
	}

	public clear(contextLost = false): void {
		for (const ref of this._entries) {
			const entry = ref.deref();
			if (entry) {
				this._context.unregisterTextureGC(entry.token);
				if (!contextLost) {
					this._context.deleteTexture(entry.texture);
				}
			}
		}
		this._entries.clear();
		this._cache = new WeakMap();
	}
}
