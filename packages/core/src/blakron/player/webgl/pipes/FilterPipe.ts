import type { DisplayObject } from '../../../display/DisplayObject.js';
import type { Filter } from '../../../filters/Filter.js';
import { ColorMatrixFilter } from '../../../filters/ColorMatrixFilter.js';
import type { WebGLRenderBuffer } from '../WebGLRenderBuffer.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../../RenderPipe.js';
import { WebGLRenderBuffer as WGLBuf } from '../WebGLRenderBuffer.js';

// ── Instructions ──────────────────────────────────────────────────────────────

/** Marks the start of a filtered subtree. */
export interface FilterPushInstruction extends Instruction {
	readonly renderPipeId: 'filterPush';
	renderable: DisplayObject;
	filters: Filter[];
	offsetX: number;
	offsetY: number;
	/**
	 * The blend mode that was active before this filter changed it.
	 * Set during executePush() so executePop() can restore it.
	 */
	savedBlendMode: string;
}

/** Marks the end of a filtered subtree — composites the offscreen result. */
export interface FilterPopInstruction extends Instruction {
	readonly renderPipeId: 'filterPop';
	renderable: DisplayObject;
	/** Back-reference to the matching push instruction. */
	push: FilterPushInstruction;
}

// ── Pipe ──────────────────────────────────────────────────────────────────────

const BLEND_MODES: Record<number, string> = {
	0: 'source-over',
	1: 'lighter',
	2: 'destination-out',
};

const INSTRUCTION_POOL_LIMIT = 256;

/**
 * Handles filter rendering for WebGL.
 *
 * The renderer calls pushFilter() before traversing the filtered subtree and
 * popFilter() after. The pop instruction composites the offscreen buffer back
 * onto the main buffer with the filter applied.
 *
 * This mirrors the old WebGLRenderer._drawWithFilter() logic but expressed as
 * a pair of instructions so the traversal and execution phases are separated.
 */
export class FilterPipe implements RenderPipe<DisplayObject> {
	// ── Static fields ─────────────────────────────────────────────────────────
	public static readonly PUSH_ID = 'filterPush';
	public static readonly POP_ID = 'filterPop';
	private static readonly _pushPool: FilterPushInstruction[] = [];
	private static readonly _popPool: FilterPopInstruction[] = [];

	// ── RenderPipe impl ───────────────────────────────────────────────────────

	public addToInstructionSet(_renderable: DisplayObject, _set: InstructionSet): void {
		// FilterPipe instructions are added by the renderer's traversal logic,
		// not by this method — see WebGLRenderer._buildInstructions().
	}

	public updateRenderable(_renderable: DisplayObject): void {}

	// ── Factory helpers used by the renderer ─────────────────────────────────

	public static makePush(
		renderable: DisplayObject,
		filters: Filter[],
		offsetX: number,
		offsetY: number,
	): FilterPushInstruction {
		const inst = FilterPipe._pushPool.pop();
		if (inst) {
			inst.renderable = renderable;
			inst.filters = filters;
			inst.offsetX = offsetX;
			inst.offsetY = offsetY;
			inst.savedBlendMode = 'source-over';
			return inst;
		}
		return { renderPipeId: 'filterPush', renderable, filters, offsetX, offsetY, savedBlendMode: 'source-over' };
	}

	public static makePop(renderable: DisplayObject, push: FilterPushInstruction): FilterPopInstruction {
		const inst = FilterPipe._popPool.pop();
		if (inst) {
			inst.renderable = renderable;
			inst.push = push;
			return inst;
		}
		return { renderPipeId: 'filterPop', renderable, push };
	}

	public static releasePush(inst: FilterPushInstruction): void {
		inst.renderable = undefined as never;
		inst.filters = [];
		if (FilterPipe._pushPool.length < INSTRUCTION_POOL_LIMIT) FilterPipe._pushPool.push(inst);
	}

	public static releasePop(inst: FilterPopInstruction): void {
		inst.renderable = undefined as never;
		inst.push = undefined as never;
		if (FilterPipe._popPool.length < INSTRUCTION_POOL_LIMIT) FilterPipe._popPool.push(inst);
	}

	// ── Execute ───────────────────────────────────────────────────────────────

	/**
	 * Called by the renderer when it encounters a filterPush instruction.
	 *
	 * Two paths:
	 * - ColorMatrix inline: sets activeFilter on the main buffer, returns undefined.
	 *   Subsequent leaf instructions draw directly to the main buffer with the
	 *   filter applied per-draw-call.
	 * - All other filters: allocates an offscreen buffer and activates it via
	 *   pushBuffer so that ALL subsequent draw calls (until filterPop) land in
	 *   the offscreen buffer, not the main buffer.
	 *
	 * Returns the offscreen buffer (or undefined for inline path).
	 */
	public executePush(inst: FilterPushInstruction, buffer: WebGLRenderBuffer): WebGLRenderBuffer | undefined {
		const filters = inst.filters;
		if (!filters.length) return undefined;

		const bounds = inst.renderable.$getOriginalBounds();
		if (bounds.width <= 0 || bounds.height <= 0) return undefined;

		// Inline ColorMatrix optimisation: no offscreen buffer needed.
		// Flush any pending commands first, then re-activate the current buffer
		// so the GL FBO + viewport/projection are in a known-good state before
		// the leaf draw commands are queued.  Without this, the colorTransform
		// draw may execute against a stale FBO left by a previous filter pass.
		if (!inst.renderable.$mask && filters.length === 1 && filters[0] instanceof ColorMatrixFilter) {
			const hasBlend = inst.renderable.$blendMode !== 0;
			if (hasBlend) {
				inst.savedBlendMode = buffer.context.currentBlendMode;
				buffer.context.setGlobalCompositeOperation(
					BLEND_MODES[inst.renderable.$blendMode] ?? 'source-over',
				);
			}
			// Flush pending batched commands so the GL state is clean, then
			// re-push the current buffer to guarantee an ACT_BUFFER command
			// precedes the upcoming leaf draw in the next flush.
			buffer.context.flush();
			buffer.context.pushBuffer(buffer);
			buffer.context.activeFilter = filters[0];
			return undefined; // signal: inline mode, no offscreen
		}

		// Offscreen path: redirect all subsequent draw calls into this buffer.
		// Expand the buffer by the union of all filters' padding so blur/glow
		// has room to bleed outside the content bounds.
		let padL = 0,
			padR = 0,
			padT = 0,
			padB = 0;
		for (const f of filters) {
			const p = f.getPadding();
			if (p.left > padL) padL = p.left;
			if (p.right > padR) padR = p.right;
			if (p.top > padT) padT = p.top;
			if (p.bottom > padB) padB = p.bottom;
		}
		const offW = Math.ceil(bounds.width + padL + padR);
		const offH = Math.ceil(bounds.height + padT + padB);
		const offscreen = WGLBuf.create(buffer.context, offW, offH);
		// Store padding offsets so the renderer can adjust the offscreen origin.
		offscreen.filterPadX = padL;
		offscreen.filterPadY = padT;

		// pushBuffer activates the offscreen FBO so WebGL draws land there.
		offscreen.context.pushBuffer(offscreen);
		return offscreen;
	}

	/**
	 * Called by the renderer when it encounters a filterPop instruction.
	 * Deactivates the offscreen buffer and composites it back onto the main buffer.
	 */
	public executePop(
		inst: FilterPopInstruction,
		buffer: WebGLRenderBuffer,
		offscreen: WebGLRenderBuffer | undefined,
	): void {
		const { renderable, push } = inst;
		const filters = push.filters;
		const hasBlend = renderable.$blendMode !== 0;
		const blendOp = BLEND_MODES[renderable.$blendMode] ?? 'source-over';

		// Inline ColorMatrix path — clear the filter flag and pop the buffer
		// that was pushed in executePush to balance the stack.
		if (!offscreen) {
			buffer.context.flush();
			buffer.context.popBuffer();
			buffer.context.activeFilter = undefined;
			if (hasBlend) buffer.context.setGlobalCompositeOperation(push.savedBlendMode);
			return;
		}

		// Deactivate the offscreen buffer, restoring the main buffer as active.
		offscreen.context.popBuffer();

		const bounds = renderable.$getOriginalBounds();
		const bx = bounds.x;
		const by = bounds.y;

		// Save the current blend mode before applying the filter's blend mode,
		// so we can restore it after compositing.
		const prevBlend = buffer.context.currentBlendMode;
		if (hasBlend) buffer.context.setGlobalCompositeOperation(blendOp);

		// Position the offscreen result.
		// The offscreen texture's top-left is (padL, padT) above/left of
		// the content bounds origin, so we offset by (bx - padL, by - padT).
		const padX = offscreen.filterPadX;
		const padY = offscreen.filterPadY;
		buffer.offsetX = bx - padX;
		buffer.offsetY = by - padY;
		buffer.saveTransform();
		buffer.useOffset();

		buffer.context.compositeFilterResult(filters, offscreen);
		buffer.restoreTransform();

		if (hasBlend) buffer.context.setGlobalCompositeOperation(prevBlend);

		WGLBuf.release(offscreen);
	}
}
