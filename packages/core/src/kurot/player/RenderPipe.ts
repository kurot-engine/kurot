import type { DisplayObject } from '../display/DisplayObject.js';
import type { InstructionSet } from './InstructionSet.js';

/**
 * Builds and updates instructions for one display-object category.
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
	 * Releases resources when cleanup is requested explicitly.
	 * Stage removal does not invoke this hook automatically.
	 */
	destroyRenderable?(renderable: T): void;
}
