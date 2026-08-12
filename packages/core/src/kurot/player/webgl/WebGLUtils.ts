/** Symbol keys stored on WebGLTexture objects. */
export const SYM_GL_CONTEXT = '__blakronGlContext';
export const SYM_PREMULTIPLIED = '__blakronPremultiplied';
export const SYM_DEFAULT_EMPTY = '__blakronDefaultEmpty';
export const SYM_SMOOTHING = '__blakronSmoothing';

/**
 * Unified GL context type.
 * WebGL2RenderingContext is a strict superset of WebGL1 — all existing API
 * calls are identical, so no rendering code needs to change.
 */
export type GL = WebGL2RenderingContext | WebGLRenderingContext;

export function compileShader(gl: GL, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type)!;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error('Shader compile error:', gl.getShaderInfoLog(shader));
	}
	return shader;
}

export function createProgram(gl: GL, vertSrc: string, fragSrc: string): WebGLProgram {
	const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
	const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
	const program = gl.createProgram()!;
	gl.attachShader(program, vert);
	gl.attachShader(program, frag);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('Program link error:', gl.getProgramInfoLog(program));
	}
	return program;
}

export function deleteWebGLTexture(gl: GL | undefined, texture: WebGLTexture | undefined): void {
	if (!texture) return;
	if ((texture as Record<string, unknown>)[SYM_DEFAULT_EMPTY]) return;
	if (gl) gl.deleteTexture(texture);
}

// Premultiply tint color with alpha, packing into a uint32.
export function premultiplyTint(tint: number, alpha: number): number {
	if (alpha === 1.0) return (0xff000000 | tint) >>> 0;
	if (alpha === 0.0) return 0;
	const A = Math.round(alpha * 255);
	const R = Math.round(((tint >> 16) & 0xff) * alpha);
	const G = Math.round(((tint >> 8) & 0xff) * alpha);
	const B = Math.round((tint & 0xff) * alpha);
	return ((A << 24) | (R << 16) | (G << 8) | B) >>> 0;
}

export function checkWebGLSupport(): boolean {
	try {
		const canvas = document.createElement('canvas');
		return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
	} catch {
		return false;
	}
}
