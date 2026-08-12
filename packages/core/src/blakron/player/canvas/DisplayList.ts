import { BitmapData } from '../../display/texture/BitmapData.js';
import type { CacheAsTextureOptions, DisplayObject } from '../../display/DisplayObject.js';
import { deleteWebGLTexture, SYM_GL_CONTEXT, type GL } from '../webgl/WebGLUtils.js';
import { RenderBuffer } from './RenderBuffer.js';

/**
 * DisplayList provides per-object offscreen caching for DisplayObjects with
 * cacheAsBitmap = true. When the object is not dirty, the cached canvas is
 * reused directly, avoiding re-traversal of the subtree.
 *
 * Equivalent to Egret's sys.DisplayList (non-stage variant).
 */
export class DisplayList {
	// ── Static fields ─────────────────────────────────────────────────────────
	private static _pool: DisplayList[] = [];

	// ── Instance fields ───────────────────────────────────────────────────────
	public root: DisplayObject;
	public offsetX = 0;
	public offsetY = 0;
	public renderBuffer: RenderBuffer;
	public bitmapData?: BitmapData;
	public resolution = 1;
	public scaleMode: 'linear' | 'nearest' = 'linear';
	public actualResolution = 1;

	// ── Constructor ───────────────────────────────────────────────────────────
	private constructor(root: DisplayObject) {
		this.root = root;
		this.renderBuffer = new RenderBuffer();
	}

	// ── Public methods ────────────────────────────────────────────────────────
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
		const texture = dl.bitmapData?.webGLTexture;
		if (texture) {
			const gl = (texture as Record<string, unknown>)[SYM_GL_CONTEXT] as GL | undefined;
			deleteWebGLTexture(gl, texture);
			dl.bitmapData!.webGLTexture = undefined;
		}
		dl.renderBuffer.resize(0, 0);
		dl.bitmapData = undefined;
		if (DisplayList._pool.length < 8) DisplayList._pool.push(dl);
	}

	// ── Private methods ───────────────────────────────────────────────────────
	private _reset(root: DisplayObject): void {
		this.root = root;
		this.offsetX = 0;
		this.offsetY = 0;
		this.resolution = 1;
		this.actualResolution = 1;
		this.scaleMode = 'linear';
	}

	public configure(options: CacheAsTextureOptions = {}): void {
		const resolution = Number(options.resolution ?? 1);
		this.resolution = Number.isFinite(resolution) && resolution > 0 ? resolution : 1;
		this.scaleMode = options.scaleMode === 'nearest' ? 'nearest' : 'linear';
	}

	/**
	 * Resizes the offscreen buffer to fit the root object's bounds.
	 * Returns false if the object has zero size.
	 */
	public updateSurfaceSize(maxTextureSize: number = Number.POSITIVE_INFINITY): boolean {
		const bounds = this.root.$getOriginalBounds();
		if (bounds.width <= 0 || bounds.height <= 0) return false;
		const maxResolution = Math.min(maxTextureSize / bounds.width, maxTextureSize / bounds.height);
		this.actualResolution = Math.max(Math.min(this.resolution, maxResolution), Number.EPSILON);
		const w = Math.max(1, Math.ceil(bounds.width * this.actualResolution));
		const h = Math.max(1, Math.ceil(bounds.height * this.actualResolution));
		this.offsetX = -bounds.x;
		this.offsetY = -bounds.y;

		if (this.renderBuffer.width !== w || this.renderBuffer.height !== h) {
			this.renderBuffer.resize(w, h);
		}
		return true;
	}

	/**
	 * Updates the BitmapData reference after rendering into the buffer.
	 */
	public updateBitmapData(): void {
		const surface = this.renderBuffer.surface;
		if (!this.bitmapData) {
			this.bitmapData = new BitmapData(surface);
			this.bitmapData.deleteSource = false;
		} else {
			this.bitmapData.source = surface;
			this.bitmapData.width = surface.width;
			this.bitmapData.height = surface.height;
		}
	}
}
