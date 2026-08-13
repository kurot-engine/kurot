import type { Matrix } from '../geom/Matrix.js';
import type { RenderContext } from './RenderContext.js';

/**
 * Backend-agnostic render buffer surface consumed by leaf pipes.
 *
 * This is the second coupling point (alongside {@link RenderContext}) between a
 * leaf pipe's `execute()` body and a concrete backend. `WebGLRenderBuffer`
 * implements this interface today; a future WebGPU backend would provide its
 * own implementation without any change to the leaf pipes that consume it.
 *
 * Only the state actually read/written by `player/pipes/*.ts` is declared here
 * — backend-specific fields (`rootRenderTarget`, FBO/stencil internals,
 * `getPixels`, …) stay on the concrete class and are invisible through this
 * interface. `context` is typed {@link RenderContext} (not the concrete WebGL
 * type), so accessing `buffer.context` from a leaf pipe only exposes the
 * backend-neutral drawing surface.
 */
export interface RenderBuffer {
	/** The drawing surface — backend-neutral, see {@link RenderContext}. */
	readonly context: RenderContext;
	globalAlpha: number;
	globalMatrix: Matrix;
	offsetX: number;
	offsetY: number;
	saveTransform(): void;
	restoreTransform(): void;
}
