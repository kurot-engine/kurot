import { createProgram } from './WebGLUtils.js';
import type { GL } from './WebGLUtils.js';

export type UniformMap = Record<string, WebGLUniformLocation | null>;
export type AttributeMap = Record<string, number>;

type NativeWebGLProgram = NonNullable<ReturnType<GL['createProgram']>>;

export class WebGLProgram {
	// ── Static ────────────────────────────────────────────────────────────────

	private static _cache = new WeakMap<GL, Map<string, WebGLProgram>>();

	public static get(gl: GL, vertSrc: string, fragSrc: string, key: string): WebGLProgram {
		let cache = this._cache.get(gl);
		if (!cache) {
			cache = new Map();
			this._cache.set(gl, cache);
		}
		const sourceKey = JSON.stringify([key, vertSrc, fragSrc]);
		let program = cache.get(sourceKey);
		if (!program) {
			program = new WebGLProgram(gl, vertSrc, fragSrc, key);
			cache.set(sourceKey, program);
		}
		return program;
	}

	public static clearCache(gl?: GL, contextLost = false): void {
		if (gl) {
			const cache = this._cache.get(gl);
			if (cache && !contextLost) {
				for (const program of cache.values()) {
					gl.deleteProgram(program.id);
				}
			}
			this._cache.delete(gl);
		} else {
			this._cache = new WeakMap();
		}
	}

	// ── Instance ──────────────────────────────────────────────────────────────

	public readonly id: NativeWebGLProgram;
	public readonly uniforms: UniformMap = {};
	public readonly attributes: AttributeMap = {};
	public readonly uniformInfo: Record<string, { type: number; size: number }> = {};

	private constructor(gl: GL, vertSrc: string, fragSrc: string, name: string) {
		this.id = createProgram(gl, vertSrc, fragSrc, name);

		const totalUniforms = gl.getProgramParameter(this.id, gl.ACTIVE_UNIFORMS) as number;
		for (let i = 0; i < totalUniforms; i++) {
			const info = gl.getActiveUniform(this.id, i)!;
			this.uniforms[info.name] = gl.getUniformLocation(this.id, info.name);
			this.uniformInfo[info.name] = { type: info.type, size: info.size };
		}

		const totalAttribs = gl.getProgramParameter(this.id, gl.ACTIVE_ATTRIBUTES) as number;
		for (let i = 0; i < totalAttribs; i++) {
			const info = gl.getActiveAttrib(this.id, i)!;
			this.attributes[info.name] = gl.getAttribLocation(this.id, info.name);
		}
	}
}
