import { BitmapData } from '../../display/texture/BitmapData.js';
import type { CacheAsTextureOptions, DisplayObject } from '../../display/DisplayObject.js';
import { deleteWebGLTexture, SYM_GL_CONTEXT, type GL } from '../webgl/WebGLUtils.js';
import { CanvasBuffer } from './CanvasBuffer.js';
import { getRenderContentBounds } from '../render-bounds.js';
import type { WebGLCache } from '../webgl/WebGLCache.js';

/**
 * Owns local cache geometry, a lazy Canvas surface and an optional GPU surface.
 */
export class DisplayList {
	// ── Static fields ─────────────────────────────────────────────────────────
	private static _pool: DisplayList[] = [];

	// ── Static methods ────────────────────────────────────────────────────────
	public static create(target: DisplayObject): DisplayList | undefined {
		try {
			const dl = DisplayList._pool.pop() ?? new DisplayList(target);
			dl._reset(target);
			return dl;
		} catch {
			return undefined;
		}
	}

	public static release(dl: DisplayList): void {
		dl.$gpuCache?.dispose();
		dl.$gpuCache = undefined;
		const texture = dl.bitmapData?.webGLTexture;
		if (texture) {
			const gl = (texture as Record<string, unknown>)[SYM_GL_CONTEXT] as GL | undefined;
			deleteWebGLTexture(gl, texture);
			dl.bitmapData!.webGLTexture = undefined;
		}
		dl._canvasBuffer?.resize(0, 0);
		dl.bitmapData = undefined;
		if (DisplayList._pool.length < 8) {
			DisplayList._pool.push(dl);
		}
	}

	// ── Instance fields ───────────────────────────────────────────────────────
	public root: DisplayObject;
	public offsetX = 0;
	public offsetY = 0;
	public $gpuCache?: WebGLCache;
	public $canvasDirty = true;
	public $width = 0;
	public $height = 0;
	public bitmapData?: BitmapData;
	public resolution = 1;
	public scaleMode: 'linear' | 'nearest' = 'linear';
	public actualResolution = 1;
	private _autoResolution = true;
	private _canvasBuffer?: CanvasBuffer;

	// ── Constructor ───────────────────────────────────────────────────────────
	private constructor(root: DisplayObject) {
		this.root = root;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * Canvas fallback storage, allocated only on first access. WebGL captures
	 * keep their own framebuffer without allocating this Canvas surface.
	 */
	public get canvasBuffer(): CanvasBuffer {
		return this._canvasBuffer ??= new CanvasBuffer();
	}
	public set canvasBuffer(value: CanvasBuffer) {
		this._canvasBuffer = value;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public configure(options: CacheAsTextureOptions = {}): void {
		const resolution = options.resolution;
		if (resolution === undefined) {
			this.resolution = 1;
			this._autoResolution = true;
		} else if (Number.isFinite(resolution) && resolution > 0) {
			this.resolution = resolution;
			this._autoResolution = false;
		} else {
			this.resolution = 1;
			this._autoResolution = false;
		}
		this.scaleMode = options.scaleMode === 'nearest' ? 'nearest' : 'linear';
	}

	/**
	 * Resizes the offscreen buffer to fit the root object's bounds.
	 * Returns false if the object has zero size.
	 */
	public updateSurfaceSize(maxTextureSize: number = Number.POSITIVE_INFINITY, inheritedResolution = 1): boolean {
		if (!this.$updateGeometry(maxTextureSize, inheritedResolution)) {
			return false;
		}
		if (this.canvasBuffer.width !== this.$width || this.canvasBuffer.height !== this.$height) {
			this.canvasBuffer.resize(this.$width, this.$height);
		}
		return true;
	}

	/**
	 * Measures cache pixels without allocating a Canvas surface. GPU captures
	 * include descendant filter padding; the owner's effects composite outside.
	 */
	public $updateGeometry(maxTextureSize: number, inheritedResolution: number, includeFilters = false): boolean {
		const bounds = getRenderContentBounds(this.root, includeFilters);
		if (bounds.width <= 0 || bounds.height <= 0) {
			this.$width = this.$height = 0;
			return false;
		}
		const requestedResolution = this._autoResolution ? inheritedResolution : this.resolution;
		const maxResolution = Math.min(maxTextureSize / bounds.width, maxTextureSize / bounds.height);
		this.actualResolution = Math.max(Math.min(requestedResolution, maxResolution), Number.EPSILON);
		this.$width = Math.min(maxTextureSize, Math.max(1, Math.ceil(bounds.width * this.actualResolution)));
		this.$height = Math.min(maxTextureSize, Math.max(1, Math.ceil(bounds.height * this.actualResolution)));
		this.offsetX = -bounds.x;
		this.offsetY = -bounds.y;
		return true;
	}

	/**
	 * Updates the BitmapData reference after rendering into the buffer.
	 */
	public updateBitmapData(): void {
		const surface = this.canvasBuffer.surface;
		if (!this.bitmapData) {
			this.bitmapData = new BitmapData(surface);
			this.bitmapData.deleteSource = false;
		} else {
			this.bitmapData.source = surface;
			this.bitmapData.width = surface.width;
			this.bitmapData.height = surface.height;
		}
	}

	// ── Private methods ───────────────────────────────────────────────────────
	private _reset(root: DisplayObject): void {
		this.root = root;
		this.offsetX = 0;
		this.offsetY = 0;
		this.resolution = 1;
		this._autoResolution = true;
		this.actualResolution = 1;
		this.scaleMode = 'linear';
		this.$canvasDirty = true;
		this.$width = this.$height = 0;
	}
}
