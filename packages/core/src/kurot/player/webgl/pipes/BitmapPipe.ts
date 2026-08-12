import type { Bitmap } from '../../../display/Bitmap.js';
import type { WebGLRenderBuffer } from '../WebGLRenderBuffer.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../../RenderPipe.js';

// ── Instruction ───────────────────────────────────────────────────────────────

export interface BitmapInstruction extends Instruction {
	readonly renderPipeId: 'bitmap';
	renderable: Bitmap;
	/** Snapshot of the buffer state at build time — updated each frame. */
	offsetX: number;
	offsetY: number;
}

// ── Pipe ──────────────────────────────────────────────────────────────────────

/**
 * Handles WebGL rendering of Bitmap display objects.
 *
 * addToInstructionSet  — called once when the scene structure changes.
 * updateRenderable     — called every frame when only data changed.
 * execute              — issues the actual WebGL draw call.
 */
export class BitmapPipe implements RenderPipe<Bitmap> {
	public static readonly PIPE_ID = 'bitmap';

	// Pool of reusable instruction objects to avoid per-frame allocation.
	private static readonly _pool: BitmapInstruction[] = [];

	private static _alloc(bitmap: Bitmap, offsetX: number, offsetY: number): BitmapInstruction {
		const inst = BitmapPipe._pool.pop() ?? {
			renderPipeId: 'bitmap',
			renderable: bitmap,
			offsetX,
			offsetY,
		};
		inst.renderable = bitmap;
		inst.offsetX = offsetX;
		inst.offsetY = offsetY;
		return inst;
	}

	public static release(inst: BitmapInstruction): void {
		BitmapPipe._pool.push(inst);
	}

	// ── RenderPipe impl ───────────────────────────────────────────────────────

	public addToInstructionSet(bitmap: Bitmap, set: InstructionSet): void {
		// offsetX/Y are patched at execute time from the buffer state;
		// store 0 as placeholder — the renderer sets them before calling execute.
		set.add(BitmapPipe._alloc(bitmap, 0, 0));
	}

	public updateRenderable(_bitmap: Bitmap): void {
		// Bitmap data is read directly from the DisplayObject at execute time,
		// so no pre-upload step is needed here.
	}

	public destroyRenderable(_bitmap: Bitmap): void {
		// BitmapData GPU textures are managed by WebGLRenderContext.getWebGLTexture()
		// and released when BitmapData itself is destroyed — nothing to do here.
	}

	// ── Execute ───────────────────────────────────────────────────────────────

	/**
	 * Issue the draw call for a BitmapInstruction.
	 * Called by WebGLRenderer._executeInstructions().
	 */
	public execute(inst: BitmapInstruction, buffer: WebGLRenderBuffer): void {
		const bitmap = inst.renderable;
		const bd = bitmap.bitmapData;
		if (!bd?.source) return;

		const destW = !isNaN(bitmap.width) ? bitmap.width : bitmap.textureWidth;
		const destH = !isNaN(bitmap.height) ? bitmap.height : bitmap.textureHeight;
		if (destW <= 0 || destH <= 0) return;

		buffer.offsetX = 0;
		buffer.offsetY = 0;

		const grid = bitmap.scale9Grid;
		if (grid) {
			this._drawScale9(bitmap, bd, grid, destW, destH, buffer);
		} else {
			buffer.context.drawImage(
				bd,
				bitmap.bitmapX,
				bitmap.bitmapY,
				bitmap.bitmapWidth,
				bitmap.bitmapHeight,
				bitmap.bitmapOffsetX,
				bitmap.bitmapOffsetY,
				destW,
				destH,
				bitmap.sourceWidth,
				bitmap.sourceHeight,
				bitmap.texture?.rotated ?? false,
				bitmap.smoothing,
			);
		}

		buffer.offsetX = 0;
		buffer.offsetY = 0;
	}

	private _drawScale9(
		bitmap: Bitmap,
		bd: import('../../../display/texture/BitmapData.js').BitmapData,
		grid: import('../../../geom/Rectangle.js').Rectangle,
		destW: number,
		destH: number,
		buffer: WebGLRenderBuffer,
	): void {
		const bx = bitmap.bitmapX;
		const by = bitmap.bitmapY;
		const bw = bitmap.bitmapWidth;
		const bh = bitmap.bitmapHeight;
		const ox = bitmap.bitmapOffsetX;
		const oy = bitmap.bitmapOffsetY;
		const sw = bitmap.sourceWidth;
		const sh = bitmap.sourceHeight;
		const rotated = bitmap.texture?.rotated ?? false;
		const smoothing = bitmap.smoothing;

		const srcW0 = grid.x - ox;
		const srcH0 = grid.y - oy;
		const srcW1 = grid.width;
		const srcH1 = grid.height;
		const srcW2 = bw - srcW0 - srcW1;
		const srcH2 = bh - srcH0 - srcH1;

		const tgtW0 = srcW0;
		const tgtH0 = srcH0;
		const tgtW2 = srcW2;
		const tgtH2 = srcH2;

		if (tgtW0 + tgtW2 > destW || tgtH0 + tgtH2 > destH) {
			buffer.context.drawImage(bd, bx, by, bw, bh, ox, oy, destW, destH, sw, sh, rotated, smoothing);
			return;
		}

		const tgtW1 = destW - tgtW0 - tgtW2;
		const tgtH1 = destH - tgtH0 - tgtH2;

		const srcX0 = bx;
		const srcX1 = srcX0 + srcW0;
		const srcX2 = srcX1 + srcW1;

		const srcY0 = by;
		const srcY1 = srcY0 + srcH0;
		const srcY2 = srcY1 + srcH1;

		const tgtX0 = ox;
		const tgtX1 = tgtX0 + tgtW0;
		const tgtX2 = tgtX0 + destW - tgtW2;

		const tgtY0 = oy;
		const tgtY1 = tgtY0 + tgtH0;
		const tgtY2 = tgtY0 + destH - tgtH2;

		const ctx = buffer.context;
		const draw = (
			sx: number,
			sy: number,
			sW: number,
			sH: number,
			dx: number,
			dy: number,
			dW: number,
			dH: number,
		) => {
			if (sW <= 0 || sH <= 0 || dW <= 0 || dH <= 0) return;
			ctx.drawImage(bd, sx, sy, sW, sH, dx, dy, dW, dH, sw, sh, rotated, smoothing);
		};

		if (srcH0 > 0) {
			draw(srcX0, srcY0, srcW0, srcH0, tgtX0, tgtY0, tgtW0, tgtH0);
			draw(srcX1, srcY0, srcW1, srcH0, tgtX1, tgtY0, tgtW1, tgtH0);
			draw(srcX2, srcY0, srcW2, srcH0, tgtX2, tgtY0, tgtW2, tgtH0);
		}
		if (srcH1 > 0) {
			draw(srcX0, srcY1, srcW0, srcH1, tgtX0, tgtY1, tgtW0, tgtH1);
			draw(srcX1, srcY1, srcW1, srcH1, tgtX1, tgtY1, tgtW1, tgtH1);
			draw(srcX2, srcY1, srcW2, srcH1, tgtX2, tgtY1, tgtW2, tgtH1);
		}
		if (srcH2 > 0) {
			draw(srcX0, srcY2, srcW0, srcH2, tgtX0, tgtY2, tgtW0, tgtH2);
			draw(srcX1, srcY2, srcW1, srcH2, tgtX1, tgtY2, tgtW1, tgtH2);
			draw(srcX2, srcY2, srcW2, srcH2, tgtX2, tgtY2, tgtW2, tgtH2);
		}
	}
}
