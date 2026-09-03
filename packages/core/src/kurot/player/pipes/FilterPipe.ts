import type { DisplayObject } from '../../display/DisplayObject.js';
import type { Filter } from '../../filters/Filter.js';
import { ColorMatrixFilter } from '../../filters/ColorMatrixFilter.js';
import type { WebGLRenderBuffer } from '../webgl/WebGLRenderBuffer.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../RenderPipe.js';
import { WebGLRenderBuffer as WGLBuf } from '../webgl/WebGLRenderBuffer.js';
import { fitTextureResolution } from '../webgl/WebGLUtils.js';

/**
 * Starts a filtered subtree.
 */
export interface FilterPushInstruction extends Instruction {
	readonly renderPipeId: 'filterPush';
	renderable: DisplayObject;
	filters: Filter[];
	offsetX: number;
	offsetY: number;
	savedBlendMode: string;
}

/**
 * Ends a filtered subtree and composites its result.
 */
export interface FilterPopInstruction extends Instruction {
	readonly renderPipeId: 'filterPop';
	renderable: DisplayObject;
	push: FilterPushInstruction;
}

const BLEND_MODES: Record<number, string> = {
	0: 'source-over',
	1: 'lighter',
	2: 'destination-out',
};

const INSTRUCTION_POOL_LIMIT = 256;

/**
 * Renders filtered subtrees through paired push and pop instructions.
 */
export class FilterPipe implements RenderPipe<DisplayObject> {

	// ── Static fields ─────────────────────────────────────────────────────────
	public static readonly PUSH_ID = 'filterPush';
    public static readonly POP_ID = 'filterPop';

	private static readonly _pushPool: FilterPushInstruction[] = [];
	private static readonly _popPool: FilterPopInstruction[] = [];

	// ── Public methods ────────────────────────────────────────────────────────

	public addToInstructionSet(_renderable: DisplayObject, _set: InstructionSet): void {}

	public updateRenderable(_renderable: DisplayObject): void {}

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

	/**
	 * Activates inline color-matrix rendering or an offscreen filter buffer.
	 * Pending commands are flushed before inline rendering so the framebuffer
	 * and activation command match the current buffer.
	 */
	public executePush(inst: FilterPushInstruction, buffer: WebGLRenderBuffer): WebGLRenderBuffer | undefined {
		const filters = inst.filters;
		if (!filters.length) return undefined;

		const bounds = inst.renderable.$getOriginalBounds();
		if (bounds.width <= 0 || bounds.height <= 0) return undefined;

		if (!inst.renderable.$mask && filters.length === 1 && filters[0] instanceof ColorMatrixFilter) {
			const hasBlend = inst.renderable.$blendMode !== 0;
			if (hasBlend) {
				inst.savedBlendMode = buffer.context.currentBlendMode;
				buffer.context.setGlobalCompositeOperation(
					BLEND_MODES[inst.renderable.$blendMode] ?? 'source-over',
				);
			}
			buffer.context.flush();
			buffer.context.pushBuffer(buffer);
			buffer.context.activeFilter = filters[0];
			return undefined;
		}

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
		const resolution = fitTextureResolution(
			offW,
			offH,
			buffer.resolution,
			buffer.context.maxTextureSize,
		);
		const offscreen = WGLBuf.create(
			buffer.context,
			Math.ceil(offW * resolution),
			Math.ceil(offH * resolution),
		);
		offscreen.resolution = resolution;
		offscreen.filterPadX = padL;
		offscreen.filterPadY = padT;

		offscreen.context.pushBuffer(offscreen);
		return offscreen;
	}

	/**
	 * Restores the parent buffer and composites an offscreen filter result.
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

		if (!offscreen) {
			buffer.context.flush();
			buffer.context.popBuffer();
			buffer.context.activeFilter = undefined;
			if (hasBlend) buffer.context.setGlobalCompositeOperation(push.savedBlendMode);
			return;
		}

		offscreen.context.popBuffer();

		const bounds = renderable.$getOriginalBounds();
		const bx = bounds.x;
		const by = bounds.y;

		const prevBlend = buffer.context.currentBlendMode;
		if (hasBlend) buffer.context.setGlobalCompositeOperation(blendOp);

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
