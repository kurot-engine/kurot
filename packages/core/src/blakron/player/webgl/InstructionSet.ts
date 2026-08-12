import type { DisplayObject } from '../../display/DisplayObject.js';

/**
 * A single renderable instruction in the instruction set.
 * Each instruction captures everything needed to execute one draw operation
 * without re-reading the scene graph.
 *
 * Inspired by Pixi.js 8's Instruction / InstructionSet pattern.
 */
export interface Instruction {
	// Identifies which pipe should execute this instruction.
	readonly renderPipeId: string;
	/**
	 * The display object this instruction was built from.
	 * Used by updateRenderable() to patch GPU data without rebuilding the set.
	 */
	renderable: DisplayObject;
}

export type RenderableInstructionIndices = number | number[];

/**
 * An ordered list of render instructions for one frame.
 *
 * Key design points (from Pixi.js 8):
 * - `instructions` is reused while a set is stable and cleared on rebuild so
 *   removed display objects are not retained by stale instruction slots.
 * - `structureDirty` signals that the scene graph changed and the set must
 *   be fully rebuilt before the next render.
 * - `dirtyRenderables` holds objects whose GPU data changed but whose
 *   position in the instruction list is still valid — only those need
 *   updateRenderable(), not a full rebuild.
 */
export class InstructionSet {
	// ── Instance fields ───────────────────────────────────────────────────────

	// Instructions in execution order for the current structure.
	public readonly instructions: Instruction[] = [];

	// Number of active entries in instructions.
	public instructionSize = 0;

	// Whether the scene structure requires this set to be rebuilt.
	public structureDirty = true;

	// Deduplicated renderables awaiting an incremental data update.
	public readonly dirtyRenderables: DisplayObject[] = [];

	// Number of active entries in dirtyRenderables.
	public dirtyRenderableCount = 0;

	// Transform-bearing instruction indices associated with each renderable.
	public readonly renderableIndex: Map<DisplayObject, RenderableInstructionIndices> = new Map();

	// Membership set used to deduplicate dirty renderables within a frame.
	private readonly _dirtyRenderableSet = new Set<DisplayObject>();

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Reset all per-build and per-frame state, releasing stale object references.
	 */
	public reset(): void {
		this.instructions.length = 0;
		this.instructionSize = 0;
		this.clearDirtyRenderables();
		this.renderableIndex.clear();
	}

	// Append an instruction.
	public add(instruction: Instruction): void {
		this.instructions[this.instructionSize++] = instruction;
	}

	/**
	 * Append a leaf instruction and register it in the renderable index
	 * so transform snapshots can be patched without a full rebuild.
	 */
	public addLeaf(instruction: Instruction): void {
		this.addIndexed(instruction);
	}

	/**
	 * Append a transform-bearing instruction and index it for partial updates.
	 */
	public addIndexed(instruction: Instruction): void {
		const indices = this.renderableIndex.get(instruction.renderable);
		if (indices === undefined) {
			this.renderableIndex.set(instruction.renderable, this.instructionSize);
		} else if (typeof indices === 'number') {
			this.renderableIndex.set(instruction.renderable, [indices, this.instructionSize]);
		} else {
			indices.push(this.instructionSize);
		}
		this.instructions[this.instructionSize++] = instruction;
	}

	/**
	 * Mark a renderable as needing a data update this frame.
	 */
	public markRenderableDirty(obj: DisplayObject): void {
		if (this._dirtyRenderableSet.has(obj)) return;
		this._dirtyRenderableSet.add(obj);
		this.dirtyRenderables[this.dirtyRenderableCount++] = obj;
	}

	/**
	 * Clear consumed dirty objects and release their references.
	 */
	public clearDirtyRenderables(): void {
		this.dirtyRenderables.length = 0;
		this.dirtyRenderableCount = 0;
		this._dirtyRenderableSet.clear();
	}
}
