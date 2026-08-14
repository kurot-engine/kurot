import type { DisplayObject } from '../../display/DisplayObject.js';
import { Matrix } from '../../geom/Matrix.js';
import type { WebGLRenderBuffer } from '../webgl/WebGLRenderBuffer.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../RenderPipe.js';
import { WebGLRenderBuffer as WGLBuf } from '../webgl/WebGLRenderBuffer.js';

const INSTRUCTION_POOL_LIMIT = 256;

type DrawMaskObject = (obj: DisplayObject, buffer: WebGLRenderBuffer, offsetX: number, offsetY: number) => void;

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

/**
 * Renders masks and clipping regions through paired push and pop instructions.
 */
export class MaskPipe implements RenderPipe<DisplayObject> {

    // ── Static fields ─────────────────────────────────────────────────────────
	public static readonly PUSH_ID = 'maskPush';
    public static readonly POP_ID = 'maskPop';

	private static readonly _pushPool: MaskPushInstruction[] = [];
	private static readonly _popPool: MaskPopInstruction[] = [];

	// ── Instance fields ───────────────────────────────────────────────────────

	private readonly _drawMaskObject: DrawMaskObject;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(drawMaskObject: DrawMaskObject) {
		this._drawMaskObject = drawMaskObject;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public addToInstructionSet(_renderable: DisplayObject, _set: InstructionSet): void {}

	public updateRenderable(_renderable: DisplayObject): void {}

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

	/**
	 * Pushes a rectangular clip and reports whether it used the scissor path.
	 */
	public executeScrollRectPush(inst: MaskPushInstruction, buffer: WebGLRenderBuffer): boolean {
		const { renderable } = inst;
		const rect = renderable.$scrollRect ?? renderable.$maskRect;
		if (!rect || rect.isEmpty()) {
			return false;
		}

		const m = buffer.globalMatrix;
		if (buffer.hasScissor || m.b !== 0 || m.c !== 0) {
			buffer.context.pushMask(rect.x, rect.y, rect.width, rect.height);
			return false;
		}

		const a = m.a,
			d = m.d,
			tx = m.tx,
			ty = m.ty;
		const xMax = rect.width,
			yMax = rect.height;
		const minX = Math.min(tx, a * xMax + tx);
		const maxX = Math.max(tx, a * xMax + tx);
		const minY = Math.min(ty, d * yMax + ty);
		const maxY = Math.max(ty, d * yMax + ty);
		buffer.context.enableScissor(minX, -maxY + buffer.height, maxX - minX, maxY - minY);
		return true;
	}

	public executeScrollRectPop(buffer: WebGLRenderBuffer, usedScissor: boolean): void {
		if (usedScissor) {
			buffer.context.disableScissor();
		} else {
			buffer.context.popMask();
		}
	}

	/**
	 * Activates an offscreen buffer when object masking requires compositing.
	 */
	public executeClipPush(
		inst: MaskPushInstruction,
		buffer: WebGLRenderBuffer,
	): WebGLRenderBuffer | undefined {
		const { renderable } = inst;
		const scrollRect = renderable.$scrollRect ?? renderable.$maskRect;

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

		const displayBuffer = WGLBuf.create(buffer.context, bw, bh);
		displayBuffer.context.pushBuffer(displayBuffer);
		return displayBuffer;
	}

	/**
	 * Applies an object mask and composites the clipped subtree into its parent.
	 * Mask and display buffers are flushed before their textures are sampled or
	 * returned to the pool so later effects cannot overwrite pending input.
	 */
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
			this._drawMaskObject(mask, maskBuffer, 0, 0);
			maskBuffer.context.popBuffer();
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
			displayBuffer.context.flush();
			displayBuffer.context.setGlobalCompositeOperation('source-over');
			WGLBuf.release(maskBuffer);
		}

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

		buffer.context.flush();
		WGLBuf.release(displayBuffer);
	}
}
