import type { TextField } from '../../text/TextField.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../RenderPipe.js';
import type { RenderContext, TextureHandle } from '../RenderContext.js';
import type { RenderBuffer } from '../RenderBuffer.js';
import type { CanvasRenderer } from '../canvas/index.js';
import { CanvasBuffer } from '../canvas/index.js';

export interface TextInstruction extends Instruction {
	readonly renderPipeId: 'text';
	renderable: TextField;
	offsetX: number;
	offsetY: number;
}

interface TextCache {
	canvasBuffer: CanvasBuffer;
	texture: TextureHandle;
	textureWidth: number;
	textureHeight: number;
	canvasScaleX: number;
	canvasScaleY: number;
	contextVersion: number;
}

/**
 * Rasterizes text fields into cached textures for render-buffer drawing.
 */
export class TextPipe implements RenderPipe<TextField> {

    // ── Static fields ─────────────────────────────────────────────────────────
	public static readonly PIPE_ID = 'text';

    private static readonly _pool: TextInstruction[] = [];

	// ── Instance fields ───────────────────────────────────────────────────────
	private readonly _canvasRenderer: CanvasRenderer;
	private readonly _cache = new WeakMap<TextField, TextCache>();
	private readonly _registryTokens = new WeakMap<TextField, object>();

    private _context?: RenderContext;

	// ── Constructor ───────────────────────────────────────────────────────────
	public constructor(canvasRenderer: CanvasRenderer) {
		this._canvasRenderer = canvasRenderer;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public static release(inst: TextInstruction): void {
		TextPipe._pool.push(inst);
	}

	public addToInstructionSet(tf: TextField, set: InstructionSet): void {
		set.add(TextPipe._alloc(tf, 0, 0));
	}

	public updateRenderable(_tf: TextField): void {}

	public destroyRenderable(tf: TextField): void {
		const cache = this._cache.get(tf);
		if (cache?.texture) {
			const token = this._registryTokens.get(tf);
			if (token) {
				this._context?.unregisterTextureGC(token);
				this._registryTokens.delete(tf);
			}
			this._context?.deleteTexture(cache.texture);
		}
		this._cache.delete(tf);
	}

	/**
	 * Draws a text instruction from the TextField's canonical render state.
	 */
	public execute(inst: TextInstruction, buffer: RenderBuffer): void {
		const tf = inst.renderable;
		tf.getLinesArr();

		if (!this._context) this._context = buffer.context;

		const logicalW = Math.ceil(!isNaN(tf.$explicitWidth) ? tf.$explicitWidth : tf.textWidth);
		const logicalH = Math.ceil(!isNaN(tf.$explicitHeight) ? tf.$explicitHeight : tf.textHeight);
		if (logicalW <= 0 || logicalH <= 0) {
			return;
		}

		buffer.offsetX = 0;
		buffer.offsetY = 0;

		const requestedResolution = tf.resolution ?? buffer.context.resolution;
		let canvasScaleX = requestedResolution;
		let canvasScaleY = requestedResolution;

		const maxTexSize = buffer.context.maxTextureSize;
		if (logicalW * canvasScaleX > maxTexSize) {
			canvasScaleX *= maxTexSize / (logicalW * canvasScaleX);
		}
		if (logicalH * canvasScaleY > maxTexSize) {
			canvasScaleY *= maxTexSize / (logicalH * canvasScaleY);
		}

		const pixelW = Math.ceil(logicalW * canvasScaleX);
		const pixelH = Math.ceil(logicalH * canvasScaleY);

		let cache = this._cache.get(tf);
		if (cache && cache.contextVersion !== buffer.context.contextVersion) {
			const oldToken = this._registryTokens.get(tf);
			if (oldToken) buffer.context.unregisterTextureGC(oldToken);
			this._registryTokens.delete(tf);
			cache.texture = undefined;
			cache.contextVersion = buffer.context.contextVersion;
			tf.$renderDirty = true;
		}
		let scaleChanged = false;

		if (cache) {
			scaleChanged = cache.canvasScaleX !== canvasScaleX || cache.canvasScaleY !== canvasScaleY;
			if (scaleChanged) {
				cache.canvasScaleX = canvasScaleX;
				cache.canvasScaleY = canvasScaleY;
			}
		} else {
			cache = {
				canvasBuffer: new CanvasBuffer(pixelW, pixelH),
				texture: undefined,
				textureWidth: 0,
				textureHeight: 0,
				canvasScaleX,
				canvasScaleY,
				contextVersion: buffer.context.contextVersion,
			};
			this._cache.set(tf, cache);
		}

		const needsRebuild =
			tf.$renderDirty || cache.textureWidth !== pixelW || cache.textureHeight !== pixelH || scaleChanged;

		if (needsRebuild) {
			if (cache.canvasBuffer.width !== pixelW || cache.canvasBuffer.height !== pixelH) {
				cache.canvasBuffer.resize(pixelW, pixelH);
			}

			cache.canvasBuffer.clear();

			const ctx = cache.canvasBuffer.context;
			if (canvasScaleX !== 1 || canvasScaleY !== 1) {
				ctx.setTransform(canvasScaleX, 0, 0, canvasScaleY, 0, 0);
			}

			this._canvasRenderer.renderTextFieldToContext(tf, ctx, 0, 0);

			const surface = cache.canvasBuffer.surface;
			if (!cache.texture) {
				cache.texture = buffer.context.createTexture(surface);
				const token = {};
				buffer.context.registerTextureForGC(tf, cache.texture, token);
				this._registryTokens.set(tf, token);
			} else {
				const oldToken = this._registryTokens.get(tf);
				if (oldToken) buffer.context.unregisterTextureGC(oldToken);
				buffer.context.updateTexture(cache.texture, surface);
				const token = {};
				buffer.context.registerTextureForGC(tf, cache.texture, token);
				this._registryTokens.set(tf, token);
			}
			cache.textureWidth = pixelW;
			cache.textureHeight = pixelH;
		}

		if (!cache.texture) return;

		buffer.context.drawTexture(
			cache.texture,
			0,
			0,
			cache.textureWidth,
			cache.textureHeight,
			0,
			0,
			cache.textureWidth / canvasScaleX,
			cache.textureHeight / canvasScaleY,
			cache.textureWidth,
			cache.textureHeight,
		);
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private static _alloc(tf: TextField, ox: number, oy: number): TextInstruction {
		const inst = TextPipe._pool.pop() ?? {
			renderPipeId: 'text',
			renderable: tf,
			offsetX: ox,
			offsetY: oy,
		};
		inst.renderable = tf;
		inst.offsetX = ox;
		inst.offsetY = oy;
		return inst;
	}
}
