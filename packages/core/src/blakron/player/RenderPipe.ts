import type { DisplayObject } from '../display/DisplayObject.js';
import type { InstructionSet } from './webgl/InstructionSet.js';

/**
 * A RenderPipe handles one category of DisplayObject (Bitmap, Graphics, Mesh…).
 *
 * Inspired by Pixi.js 8's RenderPipe interface.
 *
 * Lifecycle per frame:
 *   1. If InstructionSet.structureDirty:
 *        pipe.addToInstructionSet(obj, set)   — build instruction from scratch
 *   2. Else if obj.$renderDirty:
 *        pipe.updateRenderable(obj)            — patch GPU data only
 *   3. Always:
 *        pipe.execute(instruction, ...)        — issue the actual draw call
 */
export interface RenderPipe<T extends DisplayObject = DisplayObject> {
	/**
	 * Build and append an Instruction for `renderable` into `set`.
	 * Called during the build phase when structureDirty is true.
	 */
	addToInstructionSet(renderable: T, set: InstructionSet): void;

	/**
	 * Update GPU-side data for `renderable` without rebuilding the instruction.
	 * Called during the update phase when only data changed (not structure).
	 */
	updateRenderable(renderable: T): void;

	/**
	 * Optional cleanup when a renderable is removed from the scene.
	 * Use this to release GPU textures / cached buffers.
	 */
	destroyRenderable?(renderable: T): void;
}
