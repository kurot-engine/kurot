import { BitmapData } from '../../display/texture/BitmapData.js';
import type { Filter } from '../../filters/Filter.js';
import { ColorMatrixFilter } from '../../filters/ColorMatrixFilter.js';
import { BlurFilter } from '../../filters/BlurFilter.js';
import { GlowFilter } from '../../filters/GlowFilter.js';
import { DropShadowFilter } from '../../filters/DropShadowFilter.js';
import { Rectangle } from '../../geom/Rectangle.js';
import { WebGLVertexArrayObject } from './WebGLVertexArrayObject.js';
import { WebGLDrawCmdManager, DrawCmdType } from './WebGLDrawCmdManager.js';
import { WebGLProgram } from './WebGLProgram.js';
import { ShaderLib, getBlurTier, makeBlurHFrag, makeBlurVFrag } from './shaders/ShaderLib.js';
import { ShaderLib2, getBlurTier2, makeBlurHFrag2, makeBlurVFrag2 } from './shaders/ShaderLib2.js';
import { SYM_GL_CONTEXT, SYM_PREMULTIPLIED, SYM_DEFAULT_EMPTY, SYM_SMOOTHING } from './WebGLUtils.js';
import type { GL } from './WebGLUtils.js';
import type { WebGLRenderBuffer } from './WebGLRenderBuffer.js';
import { MultiTextureBatcher, makeMultiCmd, type MultiTextureDrawCmd } from './MultiTextureBatcher.js';

interface BlurFramebufferEntry {
	texture: WebGLTexture;
	fbo: WebGLFramebuffer;
	byteSize: number;
}

const BLUR_FRAMEBUFFER_POOL_LIMIT = 16;
const BLUR_FRAMEBUFFER_POOL_BYTE_LIMIT = 64 * 1024 * 1024;

export class WebGLRenderContext {
	// ── Public readonly fields ────────────────────────────────────────────────

	public readonly gl: GL;
	public readonly isWebGL2: boolean;
	public readonly surface: HTMLCanvasElement;
	public readonly drawCmdManager: WebGLDrawCmdManager;

	// ── Shader library (selected at init based on WebGL version) ─────────────
	public readonly shaders: typeof ShaderLib | typeof ShaderLib2;
	public readonly blurTierFn: typeof getBlurTier | typeof getBlurTier2;
	public readonly makeBlurH: typeof makeBlurHFrag | typeof makeBlurHFrag2;
	public readonly makeBlurV: typeof makeBlurVFrag | typeof makeBlurVFrag2;

	// ── Public mutable fields ─────────────────────────────────────────────────

	public maxTextureSize = 2048;
	public contextLost = false;
	public projectionX = 0;
	public projectionY = 0;
	public activeFilter?: Filter;
	public currentBlendMode = 'source-over';

	// ── Private fields ────────────────────────────────────────────────────────

	private readonly _vao: WebGLVertexArrayObject;
	private readonly _batcher = new MultiTextureBatcher();
	private readonly _bufferStack: WebGLRenderBuffer[] = [];
	private _currentBuffer?: WebGLRenderBuffer;
	private readonly _vertexBuffer: WebGLBuffer;
	private readonly _indexBuffer: WebGLBuffer;
	private _bindIndices = false;
	// Track which GPU buffer size is currently allocated so we only re-allocate
	// when switching between single-texture and multi-texture layouts.
	private _gpuVertexBufferSize = 0;
	private _defaultEmptyTexture?: WebGLTexture;
	private _maxTextureUnits = MultiTextureBatcher.MAX_TEXTURES;
	private readonly _contextRestoredCallbacks: Array<() => void> = [];
	private readonly _trackedBitmapDatas: Set<WeakRef<BitmapData>> = new Set();

	// ── Blur FBO pool ─────────────────────────────────────────────────────────
	// Key: "${width}x${height}", Value: stack of reusable { texture, fbo } pairs.
	private readonly _blurFboPool: Map<string, BlurFramebufferEntry[]> = new Map();
	// Total number of framebuffer pairs currently retained across all sizes.
	private _blurFboPoolSize: number = 0;
	// Approximate RGBA texture memory retained by the blur pool.
	private _blurFboPoolBytes: number = 0;

	// Public so Player can construct it. The engine is single-Player by
	// design; there is intentionally no getInstance() singleton.
	public constructor(canvas: HTMLCanvasElement) {
		this.surface = canvas;

		// Prefer WebGL2 with GLSL ES 3.00 shaders.
		// Fall back to WebGL1 for older devices.
		const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
		if (gl2) {
			this.gl = gl2;
			this.isWebGL2 = true;
			this.shaders = ShaderLib2;
			this.blurTierFn = getBlurTier2;
			this.makeBlurH = makeBlurHFrag2;
			this.makeBlurV = makeBlurVFrag2;
		} else {
			const gl1 = canvas.getContext('webgl') as WebGLRenderingContext | null;
			if (!gl1) throw new Error('WebGL not supported');
			this.gl = gl1;
			this.isWebGL2 = false;
			this.shaders = ShaderLib;
			this.blurTierFn = getBlurTier;
			this.makeBlurH = makeBlurHFrag;
			this.makeBlurV = makeBlurVFrag;
		}

		const gl = this.gl;

		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		gl.colorMask(true, true, true, true);
		gl.activeTexture(gl.TEXTURE0);

		this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
		this._maxTextureUnits = Math.min(
			gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
			MultiTextureBatcher.MAX_TEXTURES,
		);

		this._vertexBuffer = gl.createBuffer()!;
		this._indexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);

		this.drawCmdManager = new WebGLDrawCmdManager();
		this._vao = new WebGLVertexArrayObject();

		// Pre-allocate the GPU vertex buffer at maximum single-texture capacity.
		// bufferSubData will update only the used portion each frame without
		// triggering a GPU memory reallocation.
		gl.bufferData(gl.ARRAY_BUFFER, WebGLVertexArrayObject.MAX_VERTEX_BYTES, gl.DYNAMIC_DRAW);
		this._gpuVertexBufferSize = WebGLVertexArrayObject.MAX_VERTEX_BYTES;

		this.setGlobalCompositeOperation('source-over');

		canvas.addEventListener('webglcontextlost', e => {
			e.preventDefault();
			this.contextLost = true;
		});
		canvas.addEventListener('webglcontextrestored', () => {
			this.contextLost = false;
			this._onContextRestored();
		});
	}

	// ── Getter ────────────────────────────────────────────────────────────────

	/**
	 * Register a callback invoked after the WebGL context is restored.
	 * Returns an unregister function.
	 */
	public addContextRestoredListener(fn: () => void): () => void {
		this._contextRestoredCallbacks.push(fn);
		return () => {
			const i = this._contextRestoredCallbacks.indexOf(fn);
			if (i >= 0) this._contextRestoredCallbacks.splice(i, 1);
		};
	}

	public get activatedBuffer(): WebGLRenderBuffer | undefined {
		return this._currentBuffer;
	}

	public get defaultEmptyTexture(): WebGLTexture {
		if (!this._defaultEmptyTexture) {
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = 16;
			const ctx = canvas.getContext('2d')!;
			ctx.fillStyle = 'white';
			ctx.fillRect(0, 0, 16, 16);
			this._defaultEmptyTexture = this.createTexture(canvas);
			(this._defaultEmptyTexture as Record<string, unknown>)[SYM_DEFAULT_EMPTY] = true;
		}
		return this._defaultEmptyTexture;
	}

	// ── Buffer stack ──────────────────────────────────────────────────────────

	public pushBuffer(buffer: WebGLRenderBuffer): void {
		this._bufferStack.push(buffer);
		if (buffer !== this._currentBuffer) {
			this.drawCmdManager.pushActivateBuffer(buffer);
		}
		this._currentBuffer = buffer;
	}

	public popBuffer(): void {
		if (this._bufferStack.length <= 1) return;
		this._bufferStack.pop();
		const last = this._bufferStack[this._bufferStack.length - 1];
		if (last !== this._currentBuffer) {
			this.drawCmdManager.pushActivateBuffer(last);
		}
		this._currentBuffer = last;
	}

	// ── Resize ────────────────────────────────────────────────────────────────

	public resize(width: number, height: number): void {
		this.surface.width = width;
		this.surface.height = height;
		this.onResize(width, height);
	}

	public onResize(width?: number, height?: number): void {
		const w = width ?? this.surface.width;
		const h = height ?? this.surface.height;
		this.projectionX = w / 2;
		this.projectionY = -h / 2;
		this.gl.viewport(0, 0, w, h);
	}

	// ── Stencil / Scissor ─────────────────────────────────────────────────────

	public enableStencilTest(): void {
		this.gl.enable(this.gl.STENCIL_TEST);
	}
	public disableStencilTest(): void {
		this.gl.disable(this.gl.STENCIL_TEST);
	}

	public enableScissorTest(rect: Rectangle): void {
		const gl = this.gl;
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(rect.x, rect.y, rect.width, rect.height);
	}
	public disableScissorTest(): void {
		this.gl.disable(this.gl.SCISSOR_TEST);
	}

	public enableScissor(x: number, y: number, width: number, height: number): void {
		this.drawCmdManager.pushEnableScissor(x, y, width, height);
	}
	public disableScissor(): void {
		this.drawCmdManager.pushDisableScissor();
	}

	// ── Mask (stencil-based) ──────────────────────────────────────────────────

	public pushMask(x: number, y: number, width: number, height: number): void {
		this.drawCmdManager.pushPushMask();
		const buf = this._currentBuffer!;
		this._vao.cacheArrays(buf, 0, 0, width, height, x, y, width, height, width, height);
		this.drawCmdManager.pushDrawRect();
	}

	public popMask(): void {
		this.drawCmdManager.pushPopMask();
		const buf = this._currentBuffer!;
		const rect = buf.stencilList[buf.stencilList.length - 1];
		if (rect) {
			this._vao.cacheArrays(
				buf,
				0,
				0,
				rect.width,
				rect.height,
				rect.x,
				rect.y,
				rect.width,
				rect.height,
				rect.width,
				rect.height,
			);
			this.drawCmdManager.pushDrawRect();
		}
	}

	// ── Blend mode ────────────────────────────────────────────────────────────

	public setGlobalCompositeOperation(value: string): void {
		this.currentBlendMode = value;
		this.drawCmdManager.pushSetBlend(value);
	}

	// ── Texture ───────────────────────────────────────────────────────────────

	public createTexture(source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): WebGLTexture {
		const gl = this.gl;
		const texture = gl.createTexture()!;
		(texture as Record<string, unknown>)[SYM_GL_CONTEXT] = gl;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
		(texture as Record<string, unknown>)[SYM_PREMULTIPLIED] = true;
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return texture;
	}

	public updateTexture(texture: WebGLTexture, source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): void {
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
	}

	public getWebGLTexture(bitmapData: BitmapData): WebGLTexture | undefined {
		const source = bitmapData.source;
		if (!source) return undefined;
		if (!bitmapData.webGLTexture) {
			const tex = this.createTexture(source as HTMLImageElement);
			bitmapData.webGLTexture = tex;
			(tex as Record<string, unknown>)[SYM_SMOOTHING] = true;
			this._trackedBitmapDatas.add(new WeakRef(bitmapData));
		} else if (source instanceof HTMLVideoElement) {
			// Video frames change every tick — re-upload the current frame
			this.updateTexture(bitmapData.webGLTexture, source);
		}
		return bitmapData.webGLTexture;
	}

	// ── Draw ──────────────────────────────────────────────────────────────────

	public drawImage(
		image: BitmapData,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		imageSourceWidth: number,
		imageSourceHeight: number,
		rotated: boolean,
		smoothing?: boolean,
	): void {
		if (this.contextLost || !image || !this._currentBuffer) return;
		const texture = this.getWebGLTexture(image);
		if (!texture) return;
		this.drawTexture(
			texture,
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight,
			destX,
			destY,
			destWidth,
			destHeight,
			imageSourceWidth,
			imageSourceHeight,
			undefined,
			undefined,
			undefined,
			undefined,
			rotated,
			smoothing,
		);
	}

	public drawMesh(
		image: BitmapData,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		imageSourceWidth: number,
		imageSourceHeight: number,
		meshUVs: number[],
		meshVertices: number[],
		meshIndices: number[],
		rotated: boolean,
		smoothing: boolean,
	): void {
		if (this.contextLost || !image || !this._currentBuffer) return;
		const texture = this.getWebGLTexture(image);
		if (!texture) return;
		this.drawTexture(
			texture,
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight,
			destX,
			destY,
			destWidth,
			destHeight,
			imageSourceWidth,
			imageSourceHeight,
			meshUVs,
			meshVertices,
			meshIndices,
			undefined,
			rotated,
			smoothing,
		);
	}

	public drawTexture(
		texture: WebGLTexture,
		sourceX: number,
		sourceY: number,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
		textureWidth: number,
		textureHeight: number,
		meshUVs?: number[],
		meshVertices?: number[],
		meshIndices?: number[],
		_bounds?: Rectangle,
		rotated?: boolean,
		smoothing?: boolean,
		flipY = false,
	): void {
		if (this.contextLost || !texture || !this._currentBuffer) return;
		const buf = this._currentBuffer;

		if (meshVertices && meshIndices) {
			const meshNum = meshIndices.length / 3;
			if (this._vao.reachMaxSize(meshNum * 4, meshNum * 6)) this.flush();
		} else {
			if (this._vao.reachMaxSize()) this.flush();
		}

		if (smoothing !== undefined && (texture as Record<string, unknown>)[SYM_SMOOTHING] !== smoothing) {
			this.drawCmdManager.pushChangeSmoothing(texture, smoothing);
		}

		if (meshUVs) this._vao.changeToMeshIndices();

		// ── Multi-texture path (plain quads without filter) ───────────────────
		const useMulti = !this.activeFilter && !meshVertices && this._maxTextureUnits > 1;
		if (useMulti) {
			let slot = this._batcher.getOrAssignSlot(texture);
			if (slot === -1) {
				this.flush();
				slot = this._batcher.getOrAssignSlot(texture);
			}
			if (!this._vao.isMultiTexture()) this._vao.setMultiTexture(true);
			this._vao.cacheArrays(
				buf,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				destX,
				destY,
				destWidth,
				destHeight,
				textureWidth,
				textureHeight,
				undefined,
				undefined,
				undefined,
				rotated,
				slot,
				flipY,
			);
			const cmd = makeMultiCmd(2, this._batcher.slots, this._batcher.textureCount);
			this.drawCmdManager.pushDrawMultiTexture(cmd);
			return;
		}

		// ── Single-texture path (filter, mesh, or single-unit device) ─────────
		if (this._vao.isMultiTexture()) this.flush();

		this._vao.cacheArrays(
			buf,
			sourceX,
			sourceY,
			sourceWidth,
			sourceHeight,
			destX,
			destY,
			destWidth,
			destHeight,
			textureWidth,
			textureHeight,
			meshUVs,
			meshVertices,
			meshIndices,
			rotated,
			0,
			flipY,
		);

		const count = meshIndices ? meshIndices.length / 3 : 2;
		this.drawCmdManager.pushDrawTexture(texture, count, this.activeFilter, textureWidth, textureHeight);
	}

	/**
	 * Draw a framebuffer-backed texture with vertically flipped UVs while
	 * preserving the destination geometry and its transform origin.
	 */
	public drawFramebufferTexture(
		texture: WebGLTexture,
		sourceWidth: number,
		sourceHeight: number,
		destX: number,
		destY: number,
		destWidth: number,
		destHeight: number,
	): void {
		this.drawTexture(
			texture,
			0,
			0,
			sourceWidth,
			sourceHeight,
			destX,
			destY,
			destWidth,
			destHeight,
			sourceWidth,
			sourceHeight,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			true,
		);
	}

	/**
	 * Composite the offscreen filter result back onto the current (parent) buffer.
	 *
	 * Strategy (following Egret's WebGLRenderer._drawWithFilter pattern):
	 *
	 * 1. Flush all pending batched commands so the offscreen FBO content is
	 *    fully rasterised and the GL state is clean.
	 * 2. Apply multi-pass effects (blur ping-pong) directly on the offscreen
	 *    texture via temporary FBOs.
	 * 3. Activate the parent buffer's FBO.
	 * 4. Draw the offscreen texture onto the parent buffer using the batched
	 *    drawTexture() path so that the parent buffer's globalMatrix is
	 *    correctly applied to position the result.
	 * 5. Flush immediately so the draw executes while the GL FBO state is
	 *    known-good, preventing feedback loops.
	 */
	public compositeFilterResult(filters: Filter[], offscreen: WebGLRenderBuffer): void {
		const target = offscreen.rootRenderTarget;
		if (!target?.texture) {
			return;
		}
		const w = target.width;
		const h = target.height;

		// Step 1 — flush pending commands (leaf draws into the offscreen FBO).
		this.flush();

		// Step 2 — multi-pass blur (operates entirely via direct GL calls on
		// temporary FBOs; does NOT touch the batched command queue).
		for (const filter of filters) {
			if (filter instanceof BlurFilter && (filter.blurX > 0 || filter.blurY > 0)) {
				this._drawBlurPingPong(target.texture, w, h, filter, offscreen);
			}
		}

		// Step 3 — ensure the parent buffer's FBO is the active GL framebuffer.
		if (this._currentBuffer) {
			this._currentBuffer.rootRenderTarget.activate();
			this.onResize(this._currentBuffer.width, this._currentBuffer.height);
		}

		// Step 4 — queue a batched drawTexture so the parent buffer's
		// globalMatrix positions the quad correctly.
		const nonBlurFilter = filters.find(f => !(f instanceof BlurFilter));

		this.activeFilter = nonBlurFilter;
		this.drawTexture(target.texture, 0, 0, w, h, 0, 0, w, h, w, h);
		this.activeFilter = undefined;

		// Step 5 — flush immediately.
		this.flush();
	}

	/**
	 * Two-pass separable Gaussian blur.
	 * Horizontal pass renders into a temporary FBO; vertical pass writes the
	 * blurred result back into the offscreen buffer's FBO so that the caller
	 * (compositeFilterResult) can composite it onto the parent buffer.
	 *
	 * Optimisations vs. the naive approach:
	 * - FBO pool: temporary textures/framebuffers are reused across frames
	 *   (keyed by size) to avoid the expensive create/delete cycle on mobile.
	 * - Dynamic shader tier: the loop bound in the GLSL is a compile-time
	 *   constant chosen from {4, 8, 16, 32} so the GPU can unroll/optimise it,
	 *   while still supporting blur radii up to 32 px.
	 *
	 * NOTE: This method does NOT restore the parent buffer's FBO — the caller
	 * is responsible for activating the correct destination FBO before the
	 * final composite draw.
	 */
	private _drawBlurPingPong(
		texture: WebGLTexture,
		w: number,
		h: number,
		filter: BlurFilter,
		buffer: WebGLRenderBuffer,
	): void {
		const gl = this.gl;

		// ── Acquire a temporary FBO from the pool (or create a new one) ───────
		const poolKey = `${w}x${h}`;
		let tmpEntry = this._takeBlurFramebuffer(poolKey);
		if (!tmpEntry) {
			const tmpTex = gl.createTexture()!;
			gl.bindTexture(gl.TEXTURE_2D, tmpTex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			const tmpFbo = gl.createFramebuffer()!;
			gl.bindFramebuffer(gl.FRAMEBUFFER, tmpFbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tmpTex, 0);

			tmpEntry = { texture: tmpTex, fbo: tmpFbo, byteSize: w * h * 4 };
		}

		// Clear the temporary FBO before use.
		gl.bindFramebuffer(gl.FRAMEBUFFER, tmpEntry.fbo);
		gl.viewport(0, 0, w, h);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		// ── Select shader tier based on actual blur radius ────────────────────
		const hTier = this.blurTierFn(filter.blurX);
		const vTier = this.blurTierFn(filter.blurY);
		const hKey = `blur_h_${hTier}`;
		const vKey = `blur_v_${vTier}`;

		// ── Pass 1: horizontal blur → tmpFbo ──────────────────────────────────
		const hProg = WebGLProgram.get(gl, this.shaders.fullscreen_vert, this.makeBlurH(hTier), hKey);
		this._drawFullscreenQuad(hProg, texture, w, h, prog => {
			const uBlurX = prog.uniforms['blurX'];
			const uSize = prog.uniforms['uTextureSize'];
			if (uBlurX) gl.uniform1f(uBlurX, filter.blurX);
			if (uSize) gl.uniform2f(uSize, w, h);
		});

		// ── Pass 2: vertical blur → offscreen FBO ────────────────────────────
		buffer.rootRenderTarget.activate();
		this.onResize(w, h);

		const vProg = WebGLProgram.get(gl, this.shaders.fullscreen_vert, this.makeBlurV(vTier), vKey);
		this._drawFullscreenQuad(vProg, tmpEntry.texture, w, h, prog => {
			const uBlurY = prog.uniforms['blurY'];
			const uSize = prog.uniforms['uTextureSize'];
			if (uBlurY) gl.uniform1f(uBlurY, filter.blurY);
			if (uSize) gl.uniform2f(uSize, w, h);
		});

		// ── Return the temporary FBO to the pool ──────────────────────────────
		this._returnBlurFramebuffer(poolKey, tmpEntry);
	}

	private _takeBlurFramebuffer(key: string): BlurFramebufferEntry | undefined {
		const entries = this._blurFboPool.get(key);
		if (!entries) return undefined;

		const entry = entries.pop();
		if (!entry) return undefined;

		this._blurFboPoolSize--;
		this._blurFboPoolBytes -= entry.byteSize;
		if (entries.length === 0) {
			this._blurFboPool.delete(key);
		}
		return entry;
	}

	private _returnBlurFramebuffer(key: string, entry: BlurFramebufferEntry): void {
		if (entry.byteSize > BLUR_FRAMEBUFFER_POOL_BYTE_LIMIT) {
			this.gl.deleteTexture(entry.texture);
			this.gl.deleteFramebuffer(entry.fbo);
			return;
		}

		while (
			this._blurFboPoolSize >= BLUR_FRAMEBUFFER_POOL_LIMIT ||
			this._blurFboPoolBytes + entry.byteSize > BLUR_FRAMEBUFFER_POOL_BYTE_LIMIT
		) {
			const oldest = this._blurFboPool.entries().next().value as
				| [string, BlurFramebufferEntry[]]
				| undefined;
			if (!oldest) break;

			const [oldestKey, entries] = oldest;
			const evicted = entries.pop();
			if (evicted) {
				this.gl.deleteTexture(evicted.texture);
				this.gl.deleteFramebuffer(evicted.fbo);
				this._blurFboPoolSize--;
				this._blurFboPoolBytes -= evicted.byteSize;
			}
			if (entries.length === 0) {
				this._blurFboPool.delete(oldestKey);
			}
		}

		let entries = this._blurFboPool.get(key);
		if (!entries) {
			entries = [];
			this._blurFboPool.set(key, entries);
		}
		entries.push(entry);
		this._blurFboPoolSize++;
		this._blurFboPoolBytes += entry.byteSize;
	}

	/**
	 * Draws a single full-screen quad using the given program and texture.
	 * `setUniforms` is called after `useProgram` to let the caller set
	 * filter-specific uniforms.
	 */
	private _drawFullscreenQuad(
		prog: WebGLProgram,
		texture: WebGLTexture,
		w: number,
		h: number,
		setUniforms: (prog: WebGLProgram) => void,
	): void {
		const gl = this.gl;
		gl.useProgram(prog.id);

		const stride = 5 * 4;
		const aPos = prog.attributes['aVertexPosition'];
		const aUV = prog.attributes['aTextureCoord'];
		const aColor = prog.attributes['aColor'];
		if (aPos !== undefined && aPos >= 0) {
			gl.enableVertexAttribArray(aPos);
			gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
		}
		if (aUV !== undefined && aUV >= 0) {
			gl.enableVertexAttribArray(aUV);
			gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 8);
		}
		if (aColor !== undefined && aColor >= 0) {
			gl.enableVertexAttribArray(aColor);
			gl.vertexAttribPointer(aColor, 4, gl.UNSIGNED_BYTE, true, stride, 16);
		}

		const uProj = prog.uniforms['projectionVector'];
		if (uProj) gl.uniform2f(uProj, w / 2, -h / 2);

		const uSampler = prog.uniforms['uSampler'];
		if (uSampler) gl.uniform1i(uSampler, 0);

		gl.bindTexture(gl.TEXTURE_2D, texture);
		setUniforms(prog);

		// Build a single quad covering [0,w] × [0,h] directly in a local buffer.
		const f32 = new Float32Array(20);
		const u32 = new Uint32Array(f32.buffer);
		const packed = 0xffffffff; // white, full alpha (premultiplied)
		// v0 (0,0)
		f32[0] = 0;
		f32[1] = 0;
		f32[2] = 0;
		f32[3] = 0;
		u32[4] = packed;
		// v1 (w,0)
		f32[5] = w;
		f32[6] = 0;
		f32[7] = 1;
		f32[8] = 0;
		u32[9] = packed;
		// v2 (w,h)
		f32[10] = w;
		f32[11] = h;
		f32[12] = 1;
		f32[13] = 1;
		u32[14] = packed;
		// v3 (0,h)
		f32[15] = 0;
		f32[16] = h;
		f32[17] = 0;
		f32[18] = 1;
		u32[19] = packed;

		gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STREAM_DRAW);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

		// Restore the GPU vertex buffer to its pre-allocated size so that the
		// next _flush() call can safely use bufferSubData without overflowing.
		// _drawFullscreenQuad replaces the buffer with a tiny 80-byte quad;
		// without this restore, bufferSubData would write past the end of the
		// GPU allocation and trigger INVALID_VALUE / buffer overflow errors.
		gl.bufferData(gl.ARRAY_BUFFER, this._gpuVertexBufferSize, gl.DYNAMIC_DRAW);
		this._bindIndices = false;
	}

	public clear(): void {
		this.drawCmdManager.pushClearColor();
	}

	public getPixels(x: number, y: number, width: number, height: number, pixels: Uint8Array): void {
		this.gl.readPixels(x, y, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
	}

	// ── Execute ───────────────────────────────────────────────────────────────

	public flush(): void {
		this._flush();
	}

	// ── Private — flush & dispatch ────────────────────────────────────────────

	private _onContextRestored(): void {
		const gl = this.gl;

		// Re-apply baseline GL state.
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		gl.colorMask(true, true, true, true);
		gl.activeTexture(gl.TEXTURE0);

		// Re-bind the vertex and index buffers (they are lost on context loss).
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);

		// Re-allocate the GPU vertex buffer after context loss.
		gl.bufferData(gl.ARRAY_BUFFER, this._gpuVertexBufferSize, gl.DYNAMIC_DRAW);

		// Clear the shader program cache — all programs are invalid after context loss.
		WebGLProgram.clearCache();

		// Reset internal state.
		this._bindIndices = false;
		this._batcher.reset();
		this.drawCmdManager.clear();
		this._vao.clear();

		// The default empty texture is also lost.
		this._defaultEmptyTexture = undefined;

		// All blur FBO pool entries are invalid after context loss — discard them.
		this._blurFboPool.clear();
		this._blurFboPoolSize = 0;
		this._blurFboPoolBytes = 0;

		// Invalidate all cached WebGL textures on BitmapData instances.
		// After context loss every WebGLTexture handle is invalid; clearing the
		// reference lets getWebGLTexture() lazily re-upload from the source.
		for (const ref of this._trackedBitmapDatas) {
			const bd = ref.deref();
			if (bd) {
				bd.webGLTexture = undefined;
			} else {
				// BitmapData was garbage collected — remove the dead WeakRef.
				this._trackedBitmapDatas.delete(ref);
			}
		}

		// Restore projection.
		this.onResize();

		// Notify listeners (e.g. WebGLRenderer) so they can rebuild instructions
		// and invalidate texture references.
		for (const fn of this._contextRestoredCallbacks) fn();
	}

	private _flush(): void {
		const gl = this.gl;
		const cmds = this.drawCmdManager;
		const vao = this._vao;

		if (vao.getVerticesByteLength() === 0 && cmds.drawDataLen === 0) return;

		// Upload only the vertices written this frame.
		// If the batch switched to multi-texture layout the GPU buffer may need
		// to grow (multi stride is 24B vs 20B for single); re-allocate once.
		const neededBytes = vao.getVerticesByteLength();
		if (neededBytes > 0) {
			if (neededBytes > this._gpuVertexBufferSize) {
				// Grow: re-allocate at the new maximum capacity.
				const newSize = WebGLVertexArrayObject.MAX_MULTI_VERTEX_BYTES;
				gl.bufferData(gl.ARRAY_BUFFER, newSize, gl.DYNAMIC_DRAW);
				this._gpuVertexBufferSize = newSize;
			}
			// Upload only the used portion — no GPU memory reallocation.
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(vao.getVerticesBuffer(), 0, neededBytes));
		}
		if (!this._bindIndices) {
			gl.bufferData(
				gl.ELEMENT_ARRAY_BUFFER,
				vao.isMesh() ? vao.getMeshIndices() : vao.getIndices(),
				gl.STATIC_DRAW,
			);
			// Quad indices are static — cache after first upload.
			// Mesh indices vary per frame — never cache.
			if (!vao.isMesh()) {
				this._bindIndices = true;
			}
		}

		let indexOffset = 0;
		let gpuDrawCalls = 0;

		for (let i = 0; i < cmds.drawDataLen; i++) {
			const cmd = cmds.drawData[i];
			switch (cmd.type) {
				case DrawCmdType.ACT_BUFFER:
					this._activateBuffer(cmd.buffer!, cmd.width, cmd.height);
					break;
				case DrawCmdType.RESIZE_TARGET:
					cmd.buffer!.rootRenderTarget?.resize(cmd.width, cmd.height);
					break;
				case DrawCmdType.CLEAR_COLOR:
					gl.colorMask(true, true, true, true);
					gl.clearColor(0, 0, 0, 0);
					gl.clear(gl.COLOR_BUFFER_BIT);
					break;
				case DrawCmdType.BLEND:
					this._applyBlend(cmd.value);
					break;
				case DrawCmdType.ENABLE_SCISSOR:
					gl.enable(gl.SCISSOR_TEST);
					gl.scissor(cmd.x, cmd.y, cmd.width, cmd.height);
					break;
				case DrawCmdType.DISABLE_SCISSOR:
					gl.disable(gl.SCISSOR_TEST);
					break;
				case DrawCmdType.PUSH_MASK:
					this._pushMaskDraw(indexOffset, cmd.count);
					indexOffset += cmd.count;
					break;
				case DrawCmdType.POP_MASK:
					this._popMaskDraw(indexOffset, cmd.count);
					indexOffset += cmd.count;
					break;
				case DrawCmdType.SMOOTHING:
					if (cmd.texture) {
						gl.bindTexture(gl.TEXTURE_2D, cmd.texture);
						const filter = cmd.smoothing ? gl.LINEAR : gl.NEAREST;
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
						gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
					}
					break;
				case DrawCmdType.TEXTURE:
					this._drawTextureBatch(
						cmd.texture!,
						indexOffset,
						cmd.count,
						cmd.filter,
						cmd.textureWidth,
						cmd.textureHeight,
					);
					indexOffset += cmd.count;
					gpuDrawCalls++;
					break;
				case DrawCmdType.MULTI_TEXTURE:
					if (cmd.multiCmd) {
						this._drawMultiTextureBatch(cmd.multiCmd, indexOffset, cmd.count);
						indexOffset += cmd.count;
						gpuDrawCalls++;
					}
					break;
				case DrawCmdType.RECT:
					this._drawRectBatch(indexOffset, cmd.count);
					indexOffset += cmd.count;
					gpuDrawCalls++;
					break;
			}
		}

		vao.clear();
		cmds.clear();
		this._batcher.reset();
		this._bindIndices = false;

		if (gpuDrawCalls > 0 && this._currentBuffer) {
			this._currentBuffer.drawCalls += gpuDrawCalls;
		}
	}

	// ── Private — blend & program ─────────────────────────────────────────────

	private _activateBuffer(buffer: WebGLRenderBuffer, width: number, height: number): void {
		const gl = this.gl;
		buffer.rootRenderTarget?.activate();
		if (!this._bindIndices) {
			const vao = this._vao;
			gl.bufferData(
				gl.ELEMENT_ARRAY_BUFFER,
				vao.isMesh() ? vao.getMeshIndices() : vao.getIndices(),
				gl.STATIC_DRAW,
			);
		}
		buffer.restoreStencil();
		buffer.restoreScissor();
		this.onResize(width, height);
	}

	private _applyBlend(value: string): void {
		const gl = this.gl;
		switch (value) {
			case 'source-over':
				gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
				break;
			case 'lighter':
				gl.blendFunc(gl.ONE, gl.ONE);
				break;
			case 'destination-out':
				gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
				break;
			case 'destination-in':
				gl.blendFunc(gl.ZERO, gl.SRC_ALPHA);
				break;
			default:
				gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
				break;
		}
	}

	// ── Private — draw batches ────────────────────────────────────────────────

	private _drawMultiTextureBatch(cmd: MultiTextureDrawCmd, indexOffset: number, count: number): void {
		const gl = this.gl;
		const prog = WebGLProgram.get(gl, this.shaders.multi_vert, this.shaders.multi_frag, 'multi');
		gl.useProgram(prog.id);

		const stride = 6 * 4; // MULTI_VERT_BYTE_SIZE
		const aPos = prog.attributes['aVertexPosition'];
		const aUV = prog.attributes['aTextureCoord'];
		const aColor = prog.attributes['aColor'];
		const aTid = prog.attributes['aTextureId'];
		if (aPos !== undefined && aPos >= 0) {
			gl.enableVertexAttribArray(aPos);
			gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
		}
		if (aUV !== undefined && aUV >= 0) {
			gl.enableVertexAttribArray(aUV);
			gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 8);
		}
		if (aColor !== undefined && aColor >= 0) {
			gl.enableVertexAttribArray(aColor);
			gl.vertexAttribPointer(aColor, 4, gl.UNSIGNED_BYTE, true, stride, 16);
		}
		if (aTid !== undefined && aTid >= 0) {
			gl.enableVertexAttribArray(aTid);
			gl.vertexAttribPointer(aTid, 1, gl.FLOAT, false, stride, 20);
		}

		const uProj = prog.uniforms['projectionVector'];
		if (uProj) gl.uniform2f(uProj, this.projectionX, this.projectionY);

		// Bind each texture to its unit and set the sampler uniform array.
		const uSamplers = prog.uniforms['uSamplers[0]'];
		const samplerIndices = new Int32Array(cmd.textureCount);
		for (let i = 0; i < cmd.textureCount; i++) {
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, cmd.textures[i] ?? null);
			samplerIndices[i] = i;
		}
		if (uSamplers) gl.uniform1iv(uSamplers, samplerIndices);
		// Restore active texture unit to 0 for subsequent single-texture draws.
		gl.activeTexture(gl.TEXTURE0);

		gl.drawElements(gl.TRIANGLES, count * 3, gl.UNSIGNED_SHORT, indexOffset * 6);
	}

	private _getTextureProgram(filter?: Filter): WebGLProgram {
		if (filter instanceof ColorMatrixFilter) {
			return WebGLProgram.get(
				this.gl,
				this.shaders.default_vert,
				this.shaders.colorTransform_frag,
				'colorTransform',
			);
		}
		if (filter instanceof BlurFilter || filter instanceof GlowFilter || filter instanceof DropShadowFilter) {
			return WebGLProgram.get(this.gl, this.shaders.default_vert, this.shaders.glow_frag, 'glow');
		}
		return WebGLProgram.get(this.gl, this.shaders.default_vert, this.shaders.texture_frag, 'texture');
	}

	private _drawTextureBatch(
		texture: WebGLTexture,
		indexOffset: number,
		count: number,
		filter: Filter | undefined,
		texW: number,
		texH: number,
	): void {
		const gl = this.gl;
		const prog = this._getTextureProgram(filter);
		gl.useProgram(prog.id);

		// Vertex attributes: x,y (2f), uv (2f), color (4ub)
		const stride = 5 * 4;
		const aPos = prog.attributes['aVertexPosition'];
		const aUV = prog.attributes['aTextureCoord'];
		const aColor = prog.attributes['aColor'];
		if (aPos !== undefined && aPos >= 0) {
			gl.enableVertexAttribArray(aPos);
			gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
		}
		if (aUV !== undefined && aUV >= 0) {
			gl.enableVertexAttribArray(aUV);
			gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 8);
		}
		if (aColor !== undefined && aColor >= 0) {
			gl.enableVertexAttribArray(aColor);
			gl.vertexAttribPointer(aColor, 4, gl.UNSIGNED_BYTE, true, stride, 16);
		}

		const uProj = prog.uniforms['projectionVector'];
		if (uProj) gl.uniform2f(uProj, this.projectionX, this.projectionY);

		const uSampler = prog.uniforms['uSampler'];
		if (uSampler) gl.uniform1i(uSampler, 0);

		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Apply filter uniforms
		if (filter instanceof ColorMatrixFilter) {
			const uMatrix = prog.uniforms['matrix'];
			const uAdd = prog.uniforms['colorAdd'];
			const fu = filter.uniforms as {
				matrix: number[];
				colorAdd: { x: number; y: number; z: number; w: number };
			};
			if (uMatrix) gl.uniformMatrix4fv(uMatrix, false, new Float32Array(fu.matrix));
			if (uAdd) gl.uniform4f(uAdd, fu.colorAdd.x, fu.colorAdd.y, fu.colorAdd.z, fu.colorAdd.w);
		} else if (filter instanceof BlurFilter) {
			const uBlur = prog.uniforms['blur'];
			const uSize = prog.uniforms['uTextureSize'];
			if (uBlur) gl.uniform2f(uBlur, filter.blurX, filter.blurY);
			if (uSize) gl.uniform2f(uSize, texW, texH);
		} else if (filter instanceof GlowFilter || filter instanceof DropShadowFilter) {
			const uSize = prog.uniforms['uTextureSize'];
			if (uSize) gl.uniform2f(uSize, texW, texH);
			const uColor = prog.uniforms['color'];
			const c = filter.color;
			if (uColor) gl.uniform4f(uColor, ((c >> 16) & 0xff) / 255, ((c >> 8) & 0xff) / 255, (c & 0xff) / 255, 1);
			const uAlpha = prog.uniforms['alpha'];
			if (uAlpha) gl.uniform1f(uAlpha, filter.alpha);
			const uStrength = prog.uniforms['strength'];
			if (uStrength) gl.uniform1f(uStrength, filter.strength);
			const uBlurX = prog.uniforms['blurX'];
			if (uBlurX) gl.uniform1f(uBlurX, filter.blurX);
			const uBlurY = prog.uniforms['blurY'];
			if (uBlurY) gl.uniform1f(uBlurY, filter.blurY);
			if (filter instanceof DropShadowFilter) {
				const uDist = prog.uniforms['dist'];
				if (uDist) gl.uniform1f(uDist, filter.distance);
				const uAngle = prog.uniforms['angle'];
				if (uAngle) gl.uniform1f(uAngle, -(filter.angle / 180) * Math.PI);
				const uHide = prog.uniforms['hideObject'];
				if (uHide) gl.uniform1f(uHide, filter.hideObject ? 1 : 0);
			} else {
				// GlowFilter: zero out DropShadow-specific uniforms so stale
				// values from a previous DropShadowFilter draw don't leak in.
				const uDist = prog.uniforms['dist'];
				if (uDist) gl.uniform1f(uDist, 0);
				const uAngle = prog.uniforms['angle'];
				if (uAngle) gl.uniform1f(uAngle, 0);
				const uHide = prog.uniforms['hideObject'];
				if (uHide) gl.uniform1f(uHide, 0);
			}
			const uInner = prog.uniforms['inner'];
			if (uInner) gl.uniform1f(uInner, filter instanceof GlowFilter && filter.inner ? 1 : 0);
			const uKnockout = prog.uniforms['knockout'];
			if (uKnockout) gl.uniform1f(uKnockout, filter instanceof GlowFilter && filter.knockout ? 1 : 0);
		}

		gl.drawElements(gl.TRIANGLES, count * 3, gl.UNSIGNED_SHORT, indexOffset * 6);
	}

	private _drawRectBatch(indexOffset: number, count: number): void {
		const gl = this.gl;
		const prog = WebGLProgram.get(gl, this.shaders.default_vert, this.shaders.primitive_frag, 'primitive');
		gl.useProgram(prog.id);

		const stride = 5 * 4;
		const aPos = prog.attributes['aVertexPosition'];
		const aColor = prog.attributes['aColor'];
		if (aPos !== undefined && aPos >= 0) {
			gl.enableVertexAttribArray(aPos);
			gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
		}
		if (aColor !== undefined && aColor >= 0) {
			gl.enableVertexAttribArray(aColor);
			gl.vertexAttribPointer(aColor, 4, gl.UNSIGNED_BYTE, true, stride, 16);
		}

		const uProj = prog.uniforms['projectionVector'];
		if (uProj) gl.uniform2f(uProj, this.projectionX, this.projectionY);

		gl.drawElements(gl.TRIANGLES, count * 3, gl.UNSIGNED_SHORT, indexOffset * 6);
	}

	// ── Private — stencil mask ────────────────────────────────────────────────

	private _pushMaskDraw(indexOffset: number, count: number): void {
		const gl = this.gl;
		const buf = this._currentBuffer!;
		buf.enableStencil();
		gl.colorMask(false, false, false, false);
		gl.stencilFunc(gl.ALWAYS, 1, 0xff);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
		this._drawRectBatch(indexOffset, count);
		gl.colorMask(true, true, true, true);
		gl.stencilFunc(gl.EQUAL, buf.stencilHandleCount + 1, 0xff);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
		buf.stencilHandleCount++;
	}

	private _popMaskDraw(indexOffset: number, count: number): void {
		const gl = this.gl;
		const buf = this._currentBuffer!;
		gl.colorMask(false, false, false, false);
		gl.stencilFunc(gl.ALWAYS, 1, 0xff);
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);
		this._drawRectBatch(indexOffset, count);
		gl.colorMask(true, true, true, true);
		buf.stencilHandleCount--;
		if (buf.stencilHandleCount === 0) {
			buf.disableStencil();
		} else {
			gl.stencilFunc(gl.EQUAL, buf.stencilHandleCount, 0xff);
			gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
		}
	}
}
