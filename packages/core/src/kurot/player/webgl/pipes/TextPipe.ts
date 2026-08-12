import type { TextField } from '../../../text/TextField.js';
import { TextFieldType } from '../../../text/enums/TextFieldType.js';
import type { WebGLRenderBuffer } from '../WebGLRenderBuffer.js';
import type { Instruction } from '../InstructionSet.js';
import type { InstructionSet } from '../InstructionSet.js';
import type { RenderPipe } from '../../RenderPipe.js';
import type { CanvasRenderer } from '../../canvas/index.js';
import { RenderBuffer } from '../../canvas/index.js';
import type { GL } from '../WebGLUtils.js';

// ── Texture GC registry ───────────────────────────────────────────────────────

/**
 * GC is the actual cleanup path for cached TextField textures: nothing in the
 * engine calls destroyRenderable() during normal TextField lifecycle (UI
 * relayouts, virtualized lists just drop references), so this registry is what
 * actually reclaims GPU memory. destroyRenderable() remains as an optional
 * explicit entry for future use. Mirrors GraphicsPipe's pattern.
 */
const _textureRegistry = new FinalizationRegistry<{ gl: GL; texture: WebGLTexture }>(({ gl, texture }) => {
	gl.deleteTexture(texture);
});

// ── Instruction ───────────────────────────────────────────────────────────────

export interface TextInstruction extends Instruction {
	readonly renderPipeId: 'text';
	renderable: TextField;
	offsetX: number;
	offsetY: number;
}

// ── Cache entry ───────────────────────────────────────────────────────────────

/**
 * Cached texture data for a single TextField.
 * Follows Egret's approach: rasterize to an offscreen Canvas (possibly scaled
 * for HiDPI), upload as a WebGL texture, and reuse until the text is dirty.
 */
interface TextCache {
	renderBuffer: RenderBuffer;
	texture: WebGLTexture | undefined;
	textureWidth: number;
	textureHeight: number;
	canvasScaleX: number;
	canvasScaleY: number;
}

// ── Pipe ──────────────────────────────────────────────────────────────────────

/**
 * Handles WebGL rendering of TextField display objects.
 *
 * **Architecture** (following Egret's `WebGLRenderer.renderText`):
 *
 * 1. Compute the text draw area (width × height).
 * 2. Scale by the device pixel ratio (`canvasScaleX/Y`), clamped to
 *    `maxTextureSize` so we never exceed the GPU's limit.
 * 3. Rasterize the text onto an offscreen `<canvas>` via `CanvasRenderer`.
 * 4. Upload the canvas as a WebGL texture (create once, update on change).
 * 5. Draw the texture via `buffer.context.drawTexture()`, scaling back down
 *    by `canvasScale` so the on-screen size is correct.
 *
 * The cache is invalidated when `tf.$renderDirty` is true or when the
 * dimensions / DPR change.
 */
export class TextPipe implements RenderPipe<TextField> {
	// ── Static fields ─────────────────────────────────────────────────────────
	public static readonly PIPE_ID = 'text';
	private static readonly _pool: TextInstruction[] = [];

	// ── Instance fields ───────────────────────────────────────────────────────
	private readonly _canvasRenderer: CanvasRenderer;
	private readonly _cache = new WeakMap<TextField, TextCache>();
	private readonly _registryTokens = new WeakMap<TextField, object>();
	private _gl?: GL;

	// ── Constructor ───────────────────────────────────────────────────────────
	public constructor(canvasRenderer: CanvasRenderer) {
		this._canvasRenderer = canvasRenderer;
	}

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

	public static release(inst: TextInstruction): void {
		TextPipe._pool.push(inst);
	}

	// ── RenderPipe impl ───────────────────────────────────────────────────────

	public addToInstructionSet(tf: TextField, set: InstructionSet): void {
		set.add(TextPipe._alloc(tf, 0, 0));
	}

	public updateRenderable(_tf: TextField): void {
		// Cache invalidation is driven by tf.$renderDirty,
		// which is checked at execute time — nothing to pre-upload here.
	}

	public destroyRenderable(tf: TextField): void {
		const cache = this._cache.get(tf);
		if (cache?.texture) {
			// Unregister from GC registry and delete texture immediately.
			const token = this._registryTokens.get(tf);
			if (token) {
				_textureRegistry.unregister(token);
				this._registryTokens.delete(tf);
			}
			if (this._gl) this._gl.deleteTexture(cache.texture);
		}
		this._cache.delete(tf);
	}

	// ── Execute ───────────────────────────────────────────────────────────────

	/**
	 * Render a TextField into the WebGL buffer.
	 * Follows Egret's `WebGLRenderer.renderText` pattern:
	 *
	 *   1. Compute logical width/height from the TextField.
	 *   2. Scale by canvasScale (DPR), clamped to maxTextureSize.
	 *   3. Rasterize to offscreen canvas (if dirty).
	 *   4. Upload as WebGL texture.
	 *   5. Draw with drawTexture, scaling back by canvasScale.
	 */
	public execute(inst: TextInstruction, buffer: WebGLRenderBuffer): void {
		const tf = inst.renderable;
		tf.getLinesArr(); // ensure lines are computed

		// Cache the GL context for use in destroyRenderable.
		if (!this._gl) this._gl = buffer.context.gl;

		// ── INPUT mode while focused: HTML input element owns the display ────
		// Don't render the canvas texture — the native <input>/<textarea>
		// is overlaid on top and already shows the text. Rendering here too
		// would produce a double-text artefact.
		if (tf.type === TextFieldType.INPUT && tf.isTyping) {
			return;
		}

		// ── 1. Compute logical dimensions ────────────────────────────────────
		const logicalW = Math.ceil(!isNaN(tf.$explicitWidth) ? tf.$explicitWidth : tf.textWidth);
		const logicalH = Math.ceil(!isNaN(tf.$explicitHeight) ? tf.$explicitHeight : tf.textHeight);
		if (logicalW <= 0 || logicalH <= 0) {
			return;
		}

		buffer.offsetX = 0;
		buffer.offsetY = 0;

		// ── 2. Canvas scale factor (DPR handling) ────────────────────────────
		// Follow Egret: scale the offscreen canvas by DPR so text looks crisp
		// on HiDPI screens, but clamp to maxTextureSize to avoid GPU limits.
		let canvasScaleX = /* devicePixelRatio || */ 1;
		let canvasScaleY = /* devicePixelRatio || */ 1;

		const maxTexSize = buffer.context.maxTextureSize;
		if (logicalW * canvasScaleX > maxTexSize) {
			canvasScaleX *= maxTexSize / (logicalW * canvasScaleX);
		}
		if (logicalH * canvasScaleY > maxTexSize) {
			canvasScaleY *= maxTexSize / (logicalH * canvasScaleY);
		}

		// Scaled pixel dimensions for the offscreen canvas.
		const pixelW = Math.ceil(logicalW * canvasScaleX);
		const pixelH = Math.ceil(logicalH * canvasScaleY);

		// ── 3. Cache lookup / rebuild ────────────────────────────────────────
		let cache = this._cache.get(tf);
		let scaleChanged = false;

		if (cache) {
			// Check if canvasScale changed (e.g. window moved between displays).
			scaleChanged = cache.canvasScaleX !== canvasScaleX || cache.canvasScaleY !== canvasScaleY;
			if (scaleChanged) {
				cache.canvasScaleX = canvasScaleX;
				cache.canvasScaleY = canvasScaleY;
			}
		} else {
			cache = {
				renderBuffer: new RenderBuffer(pixelW, pixelH),
				texture: undefined,
				textureWidth: 0,
				textureHeight: 0,
				canvasScaleX,
				canvasScaleY,
			};
			this._cache.set(tf, cache);
		}

		// Dirty when: text content changed, dimensions changed, or DPR changed.
		const needsRebuild =
			tf.$renderDirty || cache.textureWidth !== pixelW || cache.textureHeight !== pixelH || scaleChanged;

		if (needsRebuild) {
			// Resize the offscreen canvas if needed.
			if (cache.renderBuffer.width !== pixelW || cache.renderBuffer.height !== pixelH) {
				cache.renderBuffer.resize(pixelW, pixelH);
			}

			// Clear the buffer first (note: clear() resets the transform to identity).
			cache.renderBuffer.clear();

			// Apply canvas scale transform so text renders at the higher resolution.
			const ctx = cache.renderBuffer.context;
			if (canvasScaleX !== 1 || canvasScaleY !== 1) {
				ctx.setTransform(canvasScaleX, 0, 0, canvasScaleY, 0, 0);
			}

			// Rasterize the text onto the offscreen canvas.
			this._canvasRenderer.renderTextFieldToContext(tf, ctx, 0, 0);

			// Upload to WebGL texture.
			const surface = cache.renderBuffer.surface;
			if (!cache.texture) {
				cache.texture = buffer.context.createTexture(surface);
				// Register for GC-based cleanup.
				const token = {};
				_textureRegistry.register(tf, { gl: buffer.context.gl, texture: cache.texture }, token);
				this._registryTokens.set(tf, token);
			} else {
				// Unregister old texture, create new registration for updated texture.
				const oldToken = this._registryTokens.get(tf);
				if (oldToken) _textureRegistry.unregister(oldToken);
				buffer.context.updateTexture(cache.texture, surface);
				const token = {};
				_textureRegistry.register(tf, { gl: buffer.context.gl, texture: cache.texture }, token);
				this._registryTokens.set(tf, token);
			}
			cache.textureWidth = pixelW;
			cache.textureHeight = pixelH;
		}

		if (!cache.texture) return;

		// ── 4. Draw cached texture ───────────────────────────────────────────
		// Following Egret: draw the full texture but scale the destination by
		// 1/canvasScale so the on-screen size matches the logical dimensions.
		buffer.context.drawTexture(
			cache.texture,
			0,
			0,
			cache.textureWidth,
			cache.textureHeight, // src rect (full texture)
			0,
			0, // dest position (offset already in globalMatrix via _applyTransform)
			cache.textureWidth / canvasScaleX, // dest width (scaled back)
			cache.textureHeight / canvasScaleY, // dest height (scaled back)
			cache.textureWidth, // texture source width
			cache.textureHeight, // texture source height
		);
	}
}
