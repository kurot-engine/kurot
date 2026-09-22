import { splitMesh } from './split-mesh.js';
import { MultiPassFilter } from '../../filters/MultiPassFilter.js';
import { WebGLFilterSystem } from './WebGLFilterSystem.js';
import type { FilterSampler } from './WebGLFilterSystem.js';
import type { WebGLRenderTarget } from './WebGLRenderTarget.js';
import { CustomFilter } from '../../filters/CustomFilter.js';
import { uploadCustomUniforms } from './custom-filter-uniforms.js';
import { WebGLFilterTextures } from './WebGLFilterTextures.js';
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
import {
	SYM_GL_CONTEXT,
	SYM_PREMULTIPLIED,
	SYM_DEFAULT_EMPTY,
	SYM_SMOOTHING,
	WEBGL_CONTEXT_ATTRIBUTES,
	type GL,
} from './WebGLUtils.js';
import { WebGLRenderBuffer } from './WebGLRenderBuffer.js';
import { MultiTextureBatcher, makeMultiCmd, type MultiTextureDrawCmd } from './MultiTextureBatcher.js';
import type { RenderContext } from '../RenderContext.js';

const _gcRegistry = new FinalizationRegistry<{ gl: GL; texture: WebGLTexture }>(({ gl, texture }) => {
	gl.deleteTexture(texture);
});

export class WebGLRenderContext implements RenderContext {
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
	public contextVersion = 0;
	public resolution = 1;

	// ── Private fields ────────────────────────────────────────────────────────

	private readonly _vao: WebGLVertexArrayObject;
	private readonly _filterTextures: WebGLFilterTextures;
	private readonly _filterSystem: WebGLFilterSystem;
	private _filterPassInputs: Record<string, FilterSampler> = {};
	private _filterOutputWidth = 0;
	private _filterOutputHeight = 0;
	private readonly _batcher = new MultiTextureBatcher();
	private readonly _bufferStack: WebGLRenderBuffer[] = [];
	private _currentBuffer?: WebGLRenderBuffer;
	private _vertexBuffer: WebGLBuffer;
	private _indexBuffer: WebGLBuffer;
	private _bindIndices = false;
	private _gpuVertexBufferSize = 0;
	private _defaultEmptyTexture?: WebGLTexture;
	private _maxTextureUnits = MultiTextureBatcher.MAX_TEXTURES;
	private _filterResolution = 1;
	private readonly _contextRestoredCallbacks: Array<() => void> = [];
	private readonly _trackedBitmapDatas: Set<WeakRef<BitmapData>> = new Set();
	private readonly _uploadedVersions = new WeakMap<BitmapData, number>();

	public constructor(canvas: HTMLCanvasElement) {
		this.surface = canvas;

		const gl2 = canvas.getContext('webgl2', WEBGL_CONTEXT_ATTRIBUTES) as WebGL2RenderingContext | null;
		if (gl2) {
			this.gl = gl2;
			this.isWebGL2 = true;
			this.shaders = ShaderLib2;
			this.blurTierFn = getBlurTier2;
			this.makeBlurH = makeBlurHFrag2;
			this.makeBlurV = makeBlurVFrag2;
		} else {
			const gl1 = canvas.getContext('webgl', WEBGL_CONTEXT_ATTRIBUTES) as WebGLRenderingContext | null;
			if (!gl1) throw new Error('WebGL not supported');
			this.gl = gl1;
			this.isWebGL2 = false;
			this.shaders = ShaderLib;
			this.blurTierFn = getBlurTier;
			this.makeBlurH = makeBlurHFrag;
			this.makeBlurV = makeBlurVFrag;
		}

		const gl = this.gl;
		this._filterTextures = new WebGLFilterTextures(this);
		this._filterSystem = new WebGLFilterSystem(this);

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

	// ── Getters ───────────────────────────────────────────────────────────────

	/** Number of reusable framebuffers currently retained by the blur pipeline. */
	public get blurFramebufferPoolSize(): number {
		return this._filterSystem.pool.size;
	}

	/** Estimated GPU bytes retained by the reusable blur framebuffer pool. */
	public get blurFramebufferPoolBytes(): number {
		return this._filterSystem.pool.bytes;
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

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Registers a context-restored callback and returns its unregister function.
	 */
	public addContextRestoredListener(fn: () => void): () => void {
		this._contextRestoredCallbacks.push(fn);
		return () => {
			const i = this._contextRestoredCallbacks.indexOf(fn);
			if (i >= 0) this._contextRestoredCallbacks.splice(i, 1);
		};
	}

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
		this.flush();
		if (this._currentBuffer) {
			this._currentBuffer.enableScissor(x, y, width, height);
			this._currentBuffer.hasScissor = true;
		}
	}
	public disableScissor(): void {
		this.flush();
		if (this._currentBuffer) {
			this._currentBuffer.disableScissor();
			this._currentBuffer.hasScissor = false;
		}
	}

	// ── Mask (stencil-based) ──────────────────────────────────────────────────

	public pushMask(x: number, y: number, width: number, height: number): void {
		if (this._vao.isMultiTexture()) {
			this.flush();
		}
		this.drawCmdManager.pushPushMask();
		const buf = this._currentBuffer!;
		buf.stencilList.push({ x, y, width, height });
		this._vao.cacheArrays(buf, 0, 0, width, height, x, y, width, height, width, height);
	}

	public popMask(): void {
		if (this._vao.isMultiTexture()) {
			this.flush();
		}
		this.drawCmdManager.pushPopMask();
		const buf = this._currentBuffer!;
		const rect = buf.stencilList.pop();
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
		}
	}

	// ── Blend mode ────────────────────────────────────────────────────────────

	public setGlobalCompositeOperation(value: string): void {
		this.currentBlendMode = value;
		this.drawCmdManager.pushSetBlend(value);
	}

	// ── Texture ───────────────────────────────────────────────────────────────

	public createTexture(
		source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
		sourcePremultipliedAlpha = false,
	): WebGLTexture {
		const gl = this.gl;
		const texture = gl.createTexture()!;
		(texture as Record<string, unknown>)[SYM_GL_CONTEXT] = gl;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, sourcePremultipliedAlpha ? 0 : 1);
		(texture as Record<string, unknown>)[SYM_PREMULTIPLIED] = true;
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return texture;
	}

	public updateTexture(
		texture: WebGLTexture,
		source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
		sourcePremultipliedAlpha = false,
	): void {
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, sourcePremultipliedAlpha ? 0 : 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
	}

	/**
	 * Registers `texture` for reclamation once `owner` is garbage-collected,
	 * against `token` (an opaque object the caller keeps around so a later
	 * `unregisterTextureGC(token)` call can cancel this specific registration
	 * before it fires — e.g. when `owner`'s cached texture is replaced).
	 * Backend-agnostic replacement for a pipe holding onto a raw `gl` handle
	 * itself just to call `gl.deleteTexture()` later.
	 */
	public registerTextureForGC(owner: object, texture: WebGLTexture, token: object): void {
		_gcRegistry.register(owner, { gl: this.gl, texture }, token);
	}

	public unregisterTextureGC(token: object): void {
		_gcRegistry.unregister(token);
	}

	public deleteTexture(texture: WebGLTexture): void {
		this.gl.deleteTexture(texture);
	}

	public getWebGLTexture(bitmapData: BitmapData): WebGLTexture | undefined {
		const source = bitmapData.source;
		if (!source) return undefined;
		if (!bitmapData.webGLTexture) {
			const tex = this.createTexture(source as HTMLImageElement, bitmapData.premultipliedAlpha);
			bitmapData.webGLTexture = tex;
			this._uploadedVersions.set(bitmapData, bitmapData.contentVersion);
			(tex as Record<string, unknown>)[SYM_SMOOTHING] = true;
			this._trackedBitmapDatas.add(new WeakRef(bitmapData));
		} else if (
			(source instanceof HTMLCanvasElement || source instanceof HTMLVideoElement) &&
			this._uploadedVersions.get(bitmapData) !== bitmapData.contentVersion
		) {
			this.updateTexture(bitmapData.webGLTexture, source, bitmapData.premultipliedAlpha);
			this._uploadedVersions.set(bitmapData, bitmapData.contentVersion);
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
			if (
				meshVertices.length / 2 > WebGLVertexArrayObject.MAX_VERTICES ||
				meshIndices.length > WebGLVertexArrayObject.MAX_INDICES
			) {
				for (const chunk of splitMesh(meshVertices, meshUVs!, meshIndices)) {
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
						textureWidth,
						textureHeight,
						chunk.uvs,
						chunk.vertices,
						chunk.indices,
						_bounds,
						rotated,
						smoothing,
						flipY,
					);
				}
				return;
			}
			if (this._vao.reachMaxSize(meshVertices.length / 2, meshIndices.length)) this.flush();
		} else {
			if (this._vao.reachMaxSize()) this.flush();
		}

		if (smoothing !== undefined && (texture as Record<string, unknown>)[SYM_SMOOTHING] !== smoothing) {
			this.drawCmdManager.pushChangeSmoothing(texture, smoothing);
		}

		// ── Multi-texture path (plain quads without filter) ───────────────────
		const useMulti = !this.activeFilter && !meshVertices && this._maxTextureUnits > 1;
		if (useMulti) {
			if (!this._vao.isMultiTexture() && this._vao.getVerticesByteLength() > 0) {
				this.flush();
			}
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
		if (meshUVs) this._vao.changeToMeshIndices();

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
	 * Composites an offscreen filter result into the active parent buffer.
	 * Pending work is flushed before sampling and after compositing to prevent
	 * framebuffer feedback and state leakage.
	 */
	public compositeFilterResult(filters: Filter[], offscreen: WebGLRenderBuffer): void {
		this.flush();
		const parent = this._currentBuffer;
		if (!parent || !offscreen.rootRenderTarget.texture) return;
		const gl = this.gl;
		const blend = gl.isEnabled(gl.BLEND);
		const stencil = gl.isEnabled(gl.STENCIL_TEST);
		const scissor = gl.isEnabled(gl.SCISSOR_TEST);
		const alpha = parent.globalAlpha;
		const tint = parent.globalTintColor;
		const last = filters[filters.length - 1];
		const finalFilter =
			last instanceof BlurFilter || last instanceof MultiPassFilter || last instanceof CustomFilter
				? undefined
				: last;
		try {
			gl.disable(gl.BLEND);
			gl.disable(gl.STENCIL_TEST);
			gl.disable(gl.SCISSOR_TEST);
			this._filterSystem.render(
				finalFilter ? filters.slice(0, -1) : filters,
				offscreen.rootRenderTarget,
				offscreen.resolution,
				output => {
					parent.rootRenderTarget.activate();
					this.onResize(parent.width, parent.height);
					if (blend) {
						gl.enable(gl.BLEND);
					}
					if (stencil) {
						gl.enable(gl.STENCIL_TEST);
					}
					if (scissor) {
						gl.enable(gl.SCISSOR_TEST);
					}
					// Subtree vertices already contain world alpha and tint.
					parent.globalAlpha = 1;
					parent.globalTintColor = 0xffffff;
					this._filterResolution = (output.width * offscreen.resolution) / offscreen.width;
					this.activeFilter = finalFilter;
					this.drawFramebufferTexture(
						output.texture!,
						output.width,
						output.height,
						0,
						0,
						offscreen.width / offscreen.resolution,
						offscreen.height / offscreen.resolution,
					);
					this.flush();
				},
			);
		} finally {
			this.activeFilter = undefined;
			this._filterResolution = 1;
			this._filterPassInputs = {};
			parent.globalAlpha = alpha;
			parent.globalTintColor = tint;
			parent.rootRenderTarget.activate();
			this.onResize(parent.width, parent.height);
			if (blend) {
				gl.enable(gl.BLEND);
			} else {
				gl.disable(gl.BLEND);
			}
			if (stencil) {
				gl.enable(gl.STENCIL_TEST);
			} else {
				gl.disable(gl.STENCIL_TEST);
			}
			if (scissor) {
				gl.enable(gl.SCISSOR_TEST);
			} else {
				gl.disable(gl.SCISSOR_TEST);
			}
		}
	}

	public $drawFilterPass(
		filter: Filter | undefined,
		input: WebGLRenderTarget,
		output: WebGLRenderTarget,
		resolution: number,
		textures: Record<string, FilterSampler> = {},
	): void {
		if (input === output || Object.values(textures).some(value => value.texture === output.texture)) {
			throw new Error('A filter cannot read from its output framebuffer.');
		}
		output.activate();
		this.gl.viewport(0, 0, output.width, output.height);
		// Custom vertex shaders may cover only part of the output or discard fragments.
		output.clear();
		this._filterResolution =
			filter instanceof CustomFilter ? resolution : (resolution * input.width) / output.width;
		this._filterOutputWidth = output.width;
		this._filterOutputHeight = output.height;
		this._filterPassInputs = textures;
		try {
			this._drawFullscreenQuad(
				this._getTextureProgram(filter),
				input.texture!,
				output.width,
				output.height,
				program => this._uploadFilterUniforms(program, filter, input.width, input.height),
			);
		} finally {
			this._filterPassInputs = {};
		}
	}

	public $drawBlurPass(
		horizontal: boolean,
		input: WebGLRenderTarget,
		output: WebGLRenderTarget,
		radius: number,
	): void {
		if (input === output) throw new Error('A blur cannot read from its output framebuffer.');
		output.activate();
		this.gl.viewport(0, 0, output.width, output.height);
		const tier = this.blurTierFn(radius);
		const source = horizontal ? this.makeBlurH(tier) : this.makeBlurV(tier);
		const program = WebGLProgram.get(
			this.gl,
			this.shaders.fullscreen_vert,
			source,
			`blur_${horizontal ? 'h' : 'v'}_${tier}`,
		);
		this._drawFullscreenQuad(program, input.texture!, output.width, output.height, prog => {
			const radiusLocation = prog.uniforms[horizontal ? 'blurX' : 'blurY'];
			if (radiusLocation) {
				this.gl.uniform1f(radiusLocation, radius);
			}
			if (prog.uniforms.uTextureSize) {
				this.gl.uniform2f(prog.uniforms.uTextureSize, input.width, input.height);
			}
		});
	}

	/**
	 * Releases idle effect targets and auxiliary image uploads. Images remain caller-owned.
	 */
	public releaseFilterResources(): void {
		this.flush();
		this._filterSystem.pool.clear();
		this._filterTextures.clear();
	}

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

		setUniforms(prog);
		const uProj = prog.uniforms['projectionVector'];
		if (uProj) gl.uniform2f(uProj, w / 2, -h / 2);

		const uSampler = prog.uniforms['uSampler'];
		if (uSampler) gl.uniform1i(uSampler, 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);

		const f32 = new Float32Array(20);
		const u32 = new Uint32Array(f32.buffer);
		const packed = 0xffffffff;
		f32[0] = 0;
		f32[1] = 0;
		f32[2] = 0;
		f32[3] = 1;
		u32[4] = packed;
		f32[5] = w;
		f32[6] = 0;
		f32[7] = 1;
		f32[8] = 1;
		u32[9] = packed;
		f32[10] = w;
		f32[11] = h;
		f32[12] = 1;
		f32[13] = 0;
		u32[14] = packed;
		f32[15] = 0;
		f32[16] = h;
		f32[17] = 0;
		f32[18] = 0;
		u32[19] = packed;

		gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STREAM_DRAW);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
		if (this._currentBuffer) {
			this._currentBuffer.drawCalls++;
		}

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
		try {
			this._flush();
		} catch (error) {
			this.drawCmdManager.clear();
			this._vao.clear();
			this._batcher.reset();
			this._bindIndices = false;
			throw error;
		}
	}

	public $abortFrame(buffer: WebGLRenderBuffer): void {
		this.drawCmdManager.clear();
		this._vao.clear();
		this._batcher.reset();
		this._bindIndices = false;
		this.activeFilter = undefined;
		this._bufferStack.length = 0;
		this._bufferStack.push(buffer);
		this._currentBuffer = buffer;
		buffer.stencilList.length = 0;
		buffer.stencilHandleCount = 0;
		buffer.disableStencil();
		buffer.disableScissor();
		buffer.hasScissor = false;
		buffer.rootRenderTarget.activate();
		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.enable(this.gl.BLEND);
		this.gl.disable(this.gl.SCISSOR_TEST);
		this.gl.disable(this.gl.STENCIL_TEST);
		this.gl.colorMask(true, true, true, true);
		this.currentBlendMode = 'source-over';
		this._applyBlend('source-over');
		this.onResize(buffer.width, buffer.height);
	}

	// ── Private — flush & dispatch ────────────────────────────────────────────

	private _onContextRestored(): void {
		const gl = this.gl;
		this.contextVersion++;

		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		gl.colorMask(true, true, true, true);
		gl.activeTexture(gl.TEXTURE0);

		this._vertexBuffer = gl.createBuffer()!;
		this._indexBuffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);

		gl.bufferData(gl.ARRAY_BUFFER, this._gpuVertexBufferSize, gl.DYNAMIC_DRAW);

		WebGLProgram.clearCache(gl, true);

		this._bindIndices = false;
		this._batcher.reset();
		this.drawCmdManager.clear();
		this._vao.clear();

		this._defaultEmptyTexture = undefined;
		this._filterTextures.clear(true);

		this._filterSystem.pool.clear(true);
		WebGLRenderBuffer.handleContextRestored(this);

		for (const ref of this._trackedBitmapDatas) {
			const bd = ref.deref();
			if (bd) {
				bd.webGLTexture = undefined;
			} else {
				this._trackedBitmapDatas.delete(ref);
			}
		}

		this.onResize();

		for (const fn of this._contextRestoredCallbacks) fn();
	}

	private _flush(): void {
		const gl = this.gl;
		const cmds = this.drawCmdManager;
		const vao = this._vao;

		if (vao.getVerticesByteLength() === 0 && cmds.drawDataLen === 0) return;

		const neededBytes = vao.getVerticesByteLength();
		if (neededBytes > 0) {
			if (neededBytes > this._gpuVertexBufferSize) {
				const newSize = WebGLVertexArrayObject.MAX_MULTI_VERTEX_BYTES;
				gl.bufferData(gl.ARRAY_BUFFER, newSize, gl.DYNAMIC_DRAW);
				this._gpuVertexBufferSize = newSize;
			}
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(vao.getVerticesBuffer(), 0, neededBytes));
		}
		if (!this._bindIndices) {
			gl.bufferData(
				gl.ELEMENT_ARRAY_BUFFER,
				vao.isMesh() ? vao.getMeshIndices() : vao.getIndices(),
				gl.STATIC_DRAW,
			);
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

		const stride = 6 * 4;
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

		const uSamplers = prog.uniforms['uSamplers[0]'];
		const samplerIndices = new Int32Array(cmd.textureCount);
		for (let i = 0; i < cmd.textureCount; i++) {
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, cmd.textures[i] ?? null);
			samplerIndices[i] = i;
		}
		if (uSamplers) gl.uniform1iv(uSamplers, samplerIndices);
		gl.activeTexture(gl.TEXTURE0);

		gl.drawElements(gl.TRIANGLES, count * 3, gl.UNSIGNED_SHORT, indexOffset * 6);
	}

	private _getTextureProgram(filter?: Filter): WebGLProgram {
		if (filter instanceof CustomFilter) {
			const source = filter.$getProgram(this.isWebGL2);
			return WebGLProgram.get(
				this.gl,
				source.vertex ?? this.shaders.fullscreen_vert,
				source.fragment,
				'CustomFilter',
			);
		}
		if (filter instanceof ColorMatrixFilter) {
			return WebGLProgram.get(
				this.gl,
				this.shaders.default_vert,
				this.shaders.colorTransform_frag,
				'colorTransform',
			);
		}
		if (filter instanceof GlowFilter || filter instanceof DropShadowFilter) {
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

		this._uploadFilterUniforms(prog, filter, texW, texH);

		gl.drawElements(gl.TRIANGLES, count * 3, gl.UNSIGNED_SHORT, indexOffset * 6);
	}

	private _uploadFilterUniforms(prog: WebGLProgram, filter: Filter | undefined, texW: number, texH: number): void {
		const gl = this.gl;
		if (filter instanceof CustomFilter) {
			uploadCustomUniforms(
				gl,
				prog,
				filter,
				texW,
				texH,
				this._filterResolution,
				this._filterOutputWidth || texW,
				this._filterOutputHeight || texH,
				this._filterPassInputs,
			);
			this._filterTextures.bind(prog, filter, this._filterPassInputs);
			return;
		}

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
			if (uBlur)
				gl.uniform2f(uBlur, filter.blurX * this._filterResolution, filter.blurY * this._filterResolution);
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
			if (uBlurX) gl.uniform1f(uBlurX, filter.blurX * this._filterResolution);
			const uBlurY = prog.uniforms['blurY'];
			if (uBlurY) gl.uniform1f(uBlurY, filter.blurY * this._filterResolution);
			if (filter instanceof DropShadowFilter) {
				const uDist = prog.uniforms['dist'];
				if (uDist) gl.uniform1f(uDist, filter.distance * this._filterResolution);
				const uAngle = prog.uniforms['angle'];
				if (uAngle) gl.uniform1f(uAngle, (filter.angle / 180) * Math.PI);
				const uHide = prog.uniforms['hideObject'];
				if (uHide) gl.uniform1f(uHide, filter.hideObject ? 1 : 0);
			} else {
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
			if (uKnockout) gl.uniform1f(uKnockout, filter instanceof GlowFilter && filter.knockout ? 0 : 1);
		}
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
