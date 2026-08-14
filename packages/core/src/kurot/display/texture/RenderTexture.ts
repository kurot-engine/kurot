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

export class RenderTexture extends Texture {
	// ── Static fields ─────────────────────────────────────────────────────────

	static renderer?: RenderFunction;

	// ── Instance fields ───────────────────────────────────────────────────────

	private _canvas?: HTMLCanvasElement;
	private _ctx?: CanvasRenderingContext2D;

	// ── Public methods ────────────────────────────────────────────────────────

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

	public override dispose(): void {
		super.dispose();
		this._canvas = undefined;
		this._ctx = undefined;
	}
}
