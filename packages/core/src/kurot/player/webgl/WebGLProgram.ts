import { createProgram } from './WebGLUtils.js';
import type { GL } from './WebGLUtils.js';

export type UniformMap = Record<string, WebGLUniformLocation | null>;
export type AttributeMap = Record<string, number>;

// Alias to avoid name collision with the class itself.
type NativeWebGLProgram = NonNullable<ReturnType<GL['createProgram']>>;

export class WebGLProgram {
	// ── Static ────────────────────────────────────────────────────────────────

	private static readonly _cache = new Map<string, WebGLProgram>();

	public static get(gl: GL, vertSrc: string, fragSrc: string, key: string): WebGLProgram {
		if (!this._cache.has(key)) {
			this._cache.set(key, new WebGLProgram(gl, vertSrc, fragSrc));
		}
		return this._cache.get(key)!;
	}

	public static clearCache(): void {
		this._cache.clear();
	}

	// ── Instance ──────────────────────────────────────────────────────────────

	public readonly id: NativeWebGLProgram;
	public readonly uniforms: UniformMap = {};
	public readonly attributes: AttributeMap = {};

	private constructor(gl: GL, vertSrc: string, fragSrc: string) {
		this.id = createProgram(gl, vertSrc, fragSrc)!;

		const totalUniforms = gl.getProgramParameter(this.id, gl.ACTIVE_UNIFORMS) as number;
		for (let i = 0; i < totalUniforms; i++) {
			const info = gl.getActiveUniform(this.id, i)!;
			this.uniforms[info.name] = gl.getUniformLocation(this.id, info.name);
		}

		const totalAttribs = gl.getProgramParameter(this.id, gl.ACTIVE_ATTRIBUTES) as number;
		for (let i = 0; i < totalAttribs; i++) {
			const info = gl.getActiveAttrib(this.id, i)!;
			this.attributes[info.name] = gl.getAttribLocation(this.id, info.name);
		}
	}
}
