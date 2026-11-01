import { Rectangle } from '../../geom/Rectangle.js';
import { BitmapData } from './BitmapData.js';
import { Texture, textureScaleFactor } from './Texture.js';
import type { DisplayObject } from '../DisplayObject.js';

type RenderFunction = (
	displayObject: DisplayObject,
	width: number,
	height: number,
	offsetX: number,
	offsetY: number,
) => HTMLCanvasElement;

/**
 * A Texture backed by a Canvas capture of a display subtree.
 * Capture uses the Canvas rendering path; GPU-only custom filters are not
 * included. Dispose the capture when its owning view releases it.
 */
export class RenderTexture extends Texture {
	// ── Static fields ─────────────────────────────────────────────────────────

	/**
	 * Shared Canvas capture hook installed by Player. drawToTexture() returns
	 * false until a renderer is installed; it does not capture directly from WebGL.
	 */
	static renderer?: RenderFunction;

	// ── Instance fields ───────────────────────────────────────────────────────

	private _canvas?: HTMLCanvasElement;
	private _ctx?: CanvasRenderingContext2D;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor() {
		super();
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Captures the subtree using an optional local logical clip rectangle and a
	 * raster scale, defaulting to 1. Without a clip, the capture retains the local
	 * origin rather than tightly cropping to the content's top-left corner.
	 * Returns false for empty bounds or a missing renderer, preserving an earlier
	 * capture. A successful capture replaces bitmapData without disposing the old
	 * source; coordinate any retained references before capturing again.
	 */
	public drawToTexture(displayObject: DisplayObject, clipBounds?: Rectangle, scale = 1): boolean {
		if (clipBounds && (clipBounds.width === 0 || clipBounds.height === 0)) {
			return false;
		}

		const bounds = clipBounds ?? displayObject.$getOriginalBounds();
		if (bounds.width === 0 || bounds.height === 0) {
			return false;
		}

		if (!RenderTexture.renderer) {
			return false;
		}

		const s = scale / textureScaleFactor;
		const width = clipBounds ? bounds.width * s : (bounds.x + bounds.width) * s;
		const height = clipBounds ? bounds.height * s : (bounds.y + bounds.height) * s;
		const offsetX = clipBounds ? -clipBounds.x : 0;
		const offsetY = clipBounds ? -clipBounds.y : 0;

		this._canvas = RenderTexture.renderer(displayObject, width, height, offsetX * s, offsetY * s);
		this._ctx = this._canvas.getContext('2d', { willReadFrequently: true }) ?? undefined;
		const bitmapData = new BitmapData(this._canvas);
		bitmapData.deleteSource = false;
		bitmapData.width = width;
		bitmapData.height = height;
		this.setBitmapData(bitmapData);
		this.initData(0, 0, width, height, 0, 0, width, height, width, height);
		return true;
	}

	/**
	 * Reads one RGBA pixel as four values in [0, 255]. Coordinates are divided by
	 * textureScaleFactor and rounded to capture pixels. Returns [] without a usable
	 * capture; Canvas security/readback errors propagate to the caller.
	 */
	public override getPixel32(x: number, y: number): number[] {
		if (!this._canvas) {
			return [];
		}
		const scale = textureScaleFactor;
		const ctx = this._ctx ?? this._canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) {
			return [];
		}
		const data = ctx.getImageData(Math.round(x / scale), Math.round(y / scale), 1, 1).data;
		return [data[0], data[1], data[2], data[3]];
	}

	/**
	 * Disposes the current pixel source according to disposeBitmapData and releases
	 * this object's Canvas references. Captures replaced earlier are not disposed here.
	 */
	public override dispose(): void {
		super.dispose();
		this._canvas = undefined;
		this._ctx = undefined;
	}
}
