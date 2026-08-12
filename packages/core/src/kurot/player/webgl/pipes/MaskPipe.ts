import type { DisplayObject } from '../../../display/DisplayObject.js';
import { Matrix } from '../../../geom/Matrix.js';
import type { WebGLRenderBuffer } from '../WebGLRenderBuffer.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../../RenderPipe.js';
import { WebGLRenderBuffer as WGLBuf } from '../WebGLRenderBuffer.js';

const INSTRUCTION_POOL_LIMIT = 256;

type DrawMaskObject = (obj: DisplayObject, buffer: WebGLRenderBuffer, offsetX: number, offsetY: number) => void;

// ── Instructions ──────────────────────────────────────────────────────────────

export interface MaskPushInstruction extends Instruction {
	readonly renderPipeId: 'maskPush';
	renderable: DisplayObject;
	offsetX: number;
	offsetY: number;
	isScrollRect?: boolean;
}

export interface MaskPopInstruction extends Instruction {
	readonly renderPipeId: 'maskPop';
	renderable: DisplayObject;
	push: MaskPushInstruction;
}

// ── Pipe ──────────────────────────────────────────────────────────────────────

/**
 * Handles mask / clip / scrollRect rendering for WebGL.
 *
 * Mirrors the old WebGLRenderer._drawWithClip() and _drawWithScrollRect()
 * logic as a push/pop instruction pair.
 */
export class MaskPipe implements RenderPipe<DisplayObject> {
	// ── Static fields ─────────────────────────────────────────────────────────
	public static readonly PUSH_ID = 'maskPush';
	public static readonly POP_ID = 'maskPop';
	private static readonly _pushPool: MaskPushInstruction[] = [];
	private static readonly _popPool: MaskPopInstruction[] = [];

	// Renderer-owned traversal callback used to draw mask display objects on demand.
	private readonly _drawMaskObject: DrawMaskObject;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(drawMaskObject: DrawMaskObject) {
		this._drawMaskObject = drawMaskObject;
	}

	// ── RenderPipe impl ───────────────────────────────────────────────────────

	public addToInstructionSet(_renderable: DisplayObject, _set: InstructionSet): void {
		// Added by the renderer traversal, not here.
	}

	public updateRenderable(_renderable: DisplayObject): void {}

	// ── Factory helpers ───────────────────────────────────────────────────────

	public static makePush(renderable: DisplayObject, offsetX: number, offsetY: number): MaskPushInstruction {
		const inst = MaskPipe._pushPool.pop();
		if (inst) {
			inst.renderable = renderable;
			inst.offsetX = offsetX;
			inst.offsetY = offsetY;
			inst.isScrollRect = undefined;
			return inst;
		}
		return { renderPipeId: 'maskPush', renderable, offsetX, offsetY };
	}

	public static makePop(renderable: DisplayObject, push: MaskPushInstruction): MaskPopInstruction {
		const inst = MaskPipe._popPool.pop();
		if (inst) {
			inst.renderable = renderable;
			inst.push = push;
			return inst;
		}
		return { renderPipeId: 'maskPop', renderable, push };
	}

	public static releasePush(inst: MaskPushInstruction): void {
		inst.renderable = undefined as never;
		if (MaskPipe._pushPool.length < INSTRUCTION_POOL_LIMIT) MaskPipe._pushPool.push(inst);
	}

	public static releasePop(inst: MaskPopInstruction): void {
		inst.renderable = undefined as never;
		inst.push = undefined as never;
		if (MaskPipe._popPool.length < INSTRUCTION_POOL_LIMIT) MaskPipe._popPool.push(inst);
	}

	// ── Execute ───────────────────────────────────────────────────────────────

	/**
	 * Handles scrollRect / maskRect via scissor or stencil.
	 * Returns true if a scissor was used (caller must call executePopScissor).
	 */
	public executeScrollRectPush(inst: MaskPushInstruction, buffer: WebGLRenderBuffer): boolean {
		const { renderable } = inst;
		const rect = renderable.$scrollRect ?? renderable.$maskRect;
		if (!rect || rect.isEmpty()) {
			return false;
		}

		const m = buffer.globalMatrix;
		if (buffer.hasScissor || m.b !== 0 || m.c !== 0) {
			// Stencil path: offsetX/Y are already baked into m.tx/ty via _applyTransform,
			// so pass rect coords directly (no extra offset needed).
			buffer.context.pushMask(rect.x, rect.y, rect.width, rect.height);
			return false; // stencil path
		}

		const a = m.a,
			d = m.d,
			tx = m.tx,
			ty = m.ty;
		// The scissor rectangle is the viewport's screen-space position and size.
		// rect.x/y is the content scroll offset (already applied to child offsets
		// in _buildScrollRect via ox -= rect.x / oy -= rect.y), NOT a screen offset.
		// So we scissor at (0,0,rect.width,rect.height) in local space.
		const xMax = rect.width,
			yMax = rect.height;
		const minX = Math.min(tx, a * xMax + tx);
		const maxX = Math.max(tx, a * xMax + tx);
		const minY = Math.min(ty, d * yMax + ty);
		const maxY = Math.max(ty, d * yMax + ty);
		buffer.context.enableScissor(minX, -maxY + buffer.height, maxX - minX, maxY - minY);
		return true; // scissor path
	}

	public executeScrollRectPop(buffer: WebGLRenderBuffer, usedScissor: boolean): void {
		if (usedScissor) {
			buffer.context.disableScissor();
		} else {
			buffer.context.popMask();
		}
	}

	/**
	 * Handles DisplayObject mask (stencil-based compositing).
	 *
	 * Allocates an offscreen buffer and activates it via pushBuffer so that
	 * all subsequent leaf instructions (the masked subtree) draw into it.
	 * The mask object itself is rendered separately in executeClipPop because
	 * it is not part of the main InstructionSet.
	 *
	 * Returns the offscreen buffer, or undefined if the object has zero bounds.
	 */
	public executeClipPush(
		inst: MaskPushInstruction,
		buffer: WebGLRenderBuffer,
	): WebGLRenderBuffer | undefined {
		const { renderable } = inst;
		const scrollRect = renderable.$scrollRect ?? renderable.$maskRect;

		// Simple case: no mask object, no $children — stencil/scissor only.
		if (!renderable.$mask && (!renderable.$children || renderable.$children.length === 0)) {
			if (scrollRect) {
				buffer.context.pushMask(
					scrollRect.x + inst.offsetX,
					scrollRect.y + inst.offsetY,
					scrollRect.width,
					scrollRect.height,
				);
			}
			return undefined;
		}

		const bounds = renderable.$getOriginalBounds();
		if (bounds.width <= 0 || bounds.height <= 0) {
			return undefined;
		}

		const bw = bounds.width;
		const bh = bounds.height;

		// Allocate and activate the offscreen buffer.
		// All subsequent draw calls (the masked subtree instructions) will land here.
		const displayBuffer = WGLBuf.create(buffer.context, bw, bh);
		displayBuffer.context.pushBuffer(displayBuffer);
		return displayBuffer;
	}

	public executeClipPop(
		inst: MaskPopInstruction,
		buffer: WebGLRenderBuffer,
		displayBuffer: WebGLRenderBuffer | undefined,
	): void {
		const { renderable, push } = inst;
		const { offsetX, offsetY } = push;
		const scrollRect = renderable.$scrollRect ?? renderable.$maskRect;
		const hasBlend = renderable.$blendMode !== 0;
		const blendOp = hasBlend
			? ({ 0: 'source-over', 1: 'lighter', 2: 'destination-out' }[renderable.$blendMode] ?? 'source-over')
			: 'source-over';

		if (!displayBuffer) {
			// Simple stencil path — just pop the mask.
			if (scrollRect) {
				buffer.context.popMask();
			}
			return;
		}

		const bounds = renderable.$getOriginalBounds();
		const bx = bounds.x;
		const by = bounds.y;
		const bw = bounds.width;
		const bh = bounds.height;

		// Apply the mask object (if any) to the displayBuffer via destination-in.
		const mask = renderable.$mask;
		if (mask) {
			const maskBuffer = WGLBuf.create(buffer.context, bw, bh);
			maskBuffer.context.pushBuffer(maskBuffer);
			const maskMatrix = Matrix.create();
			maskMatrix.copyFrom(mask.$getConcatenatedMatrix());
			mask.$getConcatenatedMatrixAt(renderable, maskMatrix);
			maskMatrix.translate(-bx, -by);
			maskBuffer.setTransform(
				maskMatrix.a,
				maskMatrix.b,
				maskMatrix.c,
				maskMatrix.d,
				maskMatrix.tx,
				maskMatrix.ty,
			);
			Matrix.release(maskMatrix);
			// Render the mask shape directly — it is not in the InstructionSet.
			this._drawMaskObject(mask, maskBuffer, 0, 0);
			maskBuffer.context.popBuffer();
			// Finish producing the mask texture before sampling it from the
			// destination-in pass. This also isolates the framebuffer switch from
			// the blend-state commands used by the composite.
			maskBuffer.context.flush();

			displayBuffer.context.setGlobalCompositeOperation('destination-in');
			const mw = maskBuffer.rootRenderTarget.width;
			const mh = maskBuffer.rootRenderTarget.height;
			if (maskBuffer.rootRenderTarget.texture) {
				displayBuffer.context.drawFramebufferTexture(
					maskBuffer.rootRenderTarget.texture,
					mw,
					mh,
					0,
					0,
					mw,
					mh,
				);
			}
			// Execute destination-in while displayBuffer is still the active target.
			// Deferring this past the source-over restoration can render the mask
			// texture as an ordinary white child instead of clipping the content.
			displayBuffer.context.flush();
			displayBuffer.context.setGlobalCompositeOperation('source-over');
			WGLBuf.release(maskBuffer);
		}

		// Deactivate the offscreen buffer, restoring the main buffer as active.
		displayBuffer.context.popBuffer();

		const prevBlend = buffer.context.currentBlendMode;
		if (hasBlend) buffer.context.setGlobalCompositeOperation(blendOp);
		if (scrollRect) {
			buffer.context.pushMask(
				scrollRect.x + offsetX,
				scrollRect.y + offsetY,
				scrollRect.width,
				scrollRect.height,
			);
		}

		const dw = displayBuffer.rootRenderTarget.width;
		const dh = displayBuffer.rootRenderTarget.height;
		if (displayBuffer.rootRenderTarget.texture) {
			buffer.context.drawFramebufferTexture(
				displayBuffer.rootRenderTarget.texture,
				dw,
				dh,
				bx,
				by,
				bw,
				bh,
			);
		}

		if (scrollRect) buffer.context.popMask();
		if (hasBlend) buffer.context.setGlobalCompositeOperation(prevBlend);

		// The composite samples displayBuffer's texture. Finish that draw before
		// returning the buffer to the pool, where a later effect may resize and
		// overwrite the same framebuffer texture during this frame.
		buffer.context.flush();
		WGLBuf.release(displayBuffer);
	}
}
