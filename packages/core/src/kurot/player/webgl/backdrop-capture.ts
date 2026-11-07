import type { WebGLRenderContext } from './WebGLRenderContext.js';
import type { WebGLRenderBuffer } from './WebGLRenderBuffer.js';
import type { WebGLRenderTarget } from './WebGLRenderTarget.js';
import type { WebGLFilterTargetPool } from './WebGLFilterTargetPool.js';

export interface BackdropCapture {
	source: WebGLRenderTarget;
	area: readonly number[];
	borrowed: boolean;
}

/**
 * Existing offscreen textures are directly sampleable. A default framebuffer
 * needs GPU staging: WebGL 2 can scale a single-sample source during its blit;
 * multisample resolve and WebGL 1 copies must retain source dimensions.
 */
export function captureBackdrop(
	context: WebGLRenderContext,
	pool: WebGLFilterTargetPool,
	parent: WebGLRenderBuffer,
	area: { left: number; top: number; right: number; bottom: number },
	scale: number,
): BackdropCapture {
	const target = parent.rootRenderTarget;
	if (target.useFrameBuffer && target.texture) {
		return { source: target, area: [0, 0, parent.width, parent.height], borrowed: true };
	}
	const gl = context.gl;
	const { left, top, right, bottom } = area;
	const width = right - left;
	const height = bottom - top;
	const canScale = context.isWebGL2 && gl.getContextAttributes()?.antialias === false;
	const factor = canScale ? Math.min(1, scale) : 1;
	const source = pool.acquire(Math.max(1, Math.ceil(width * factor)), Math.max(1, Math.ceil(height * factor)));
	try {
		if (canScale) {
			const gl2 = gl as WebGL2RenderingContext;
			source.activate();
			gl2.bindFramebuffer(gl2.READ_FRAMEBUFFER, null);
			gl2.blitFramebuffer(left, parent.height - bottom, right, parent.height - top,
				0, 0, source.width, source.height, gl2.COLOR_BUFFER_BIT, gl2.LINEAR);
		} else {
			target.activate();
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, source.texture!);
			gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, left, parent.height - bottom, width, height);
		}
		return { source, area: [left, top, width, height], borrowed: false };
	} catch (error) {
		pool.release(source);
		throw error;
	}
}
