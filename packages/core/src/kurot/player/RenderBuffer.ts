import type { Matrix } from '../geom/Matrix.js';
import type { RenderContext } from './RenderContext.js';

/**
 * Render-buffer state consumed by leaf pipes.
 */
export interface RenderBuffer {
	/**
	 * Drawing operations available to the buffer.
	 */
    readonly context: RenderContext;

	globalAlpha: number;
	globalMatrix: Matrix;
	offsetX: number;
    offsetY: number;

	saveTransform(): void;
	restoreTransform(): void;
}
