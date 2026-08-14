import type { DisplayObject } from '../display/DisplayObject.js';

/**
 * A render operation captured without requiring scene-graph access at execution.
 */
export interface Instruction {
	readonly renderPipeId: string;
	/**
	 * The display object this instruction was built from.
	 * Used by updateRenderable() to patch GPU data without rebuilding the set.
	 */
	renderable: DisplayObject;
}

export type RenderableInstructionIndices = number | number[];

/**
 * Stores ordered render instructions and incremental update state.
 */
export class InstructionSet {
	// ── Instance fields ───────────────────────────────────────────────────────

	public readonly instructions: Instruction[] = [];
	public readonly dirtyRenderables: DisplayObject[] = [];
	public readonly renderableIndex: Map<DisplayObject, RenderableInstructionIndices> = new Map();

    public instructionSize = 0;
	public structureDirty = true;
	public dirtyRenderableCount = 0;

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
