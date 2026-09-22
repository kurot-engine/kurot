/**
 * Symbol keys stored on WebGLTexture objects.
 */
export const SYM_GL_CONTEXT = '__kurotGlContext';
export const SYM_PREMULTIPLIED = '__kurotPremultiplied';
export const SYM_DEFAULT_EMPTY = '__kurotDefaultEmpty';
export const SYM_SMOOTHING = '__kurotSmoothing';

/**
 * WebGL context accepted by shared rendering utilities.
 */
export type GL = WebGL2RenderingContext | WebGLRenderingContext;

// The 2D renderer never depth-tests, but nested and rotated clips need stencil.
export const WEBGL_CONTEXT_ATTRIBUTES: WebGLContextAttributes = { depth: false, stencil: true };

export function compileShader(gl: GL, type: number, source: string, name = 'unnamed'): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error(`Cannot allocate shader: ${name}`);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		const numberedSource = source
			.split('\n')
			.map((line, index) => `${index + 1}: ${line}`)
			.join('\n');
		throw new Error(
			`Shader compile failed (${name}, ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'}):\n${log}\n${numberedSource}`,
		);
	}
	return shader;
}

export function createProgram(gl: GL, vertSrc: string, fragSrc: string, name = 'unnamed'): WebGLProgram {
	const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc, name);
	let frag: WebGLShader | undefined;
	let program: WebGLProgram | undefined;
	try {
		frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc, name);
		program = gl.createProgram() ?? undefined;
		if (!program) throw new Error(`Cannot allocate program: ${name}`);
		gl.attachShader(program, vert);
		gl.attachShader(program, frag);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(`Program link failed (${name}):\n${gl.getProgramInfoLog(program)}`);
		}
		return program;
	} catch (error) {
		if (program) {
			gl.deleteProgram(program);
		}
		throw error;
	} finally {
		gl.deleteShader(vert);
		if (frag) {
			gl.deleteShader(frag);
		}
	}
}

export function deleteWebGLTexture(gl: GL | undefined, texture: WebGLTexture | undefined): void {
	if (!texture) return;
	if ((texture as Record<string, unknown>)[SYM_DEFAULT_EMPTY]) return;
	if (gl) gl.deleteTexture(texture);
}

export function premultiplyTint(tint: number, alpha: number): number {
	if (alpha === 1.0) return (0xff000000 | tint) >>> 0;
	if (alpha === 0.0) return 0;
	const A = Math.round(alpha * 255);
	const R = Math.round(((tint >> 16) & 0xff) * alpha);
	const G = Math.round(((tint >> 8) & 0xff) * alpha);
	const B = Math.round((tint & 0xff) * alpha);
	return ((A << 24) | (R << 16) | (G << 8) | B) >>> 0;
}

/**
 * Clamps a requested offscreen resolution to the GPU texture-size limit.
 */
export function fitTextureResolution(
	width: number,
	height: number,
	requestedResolution: number,
	maxTextureSize: number,
): number {
	const maxResolution = Math.min(maxTextureSize / width, maxTextureSize / height);
	return Math.max(Math.min(requestedResolution, maxResolution), Number.EPSILON);
}

export function checkWebGLSupport(): boolean {
	try {
		const canvas = document.createElement('canvas');
		return !!(
			canvas.getContext('webgl2', WEBGL_CONTEXT_ATTRIBUTES) ||
			canvas.getContext('webgl', WEBGL_CONTEXT_ATTRIBUTES)
		);
	} catch {
		return false;
	}
}
