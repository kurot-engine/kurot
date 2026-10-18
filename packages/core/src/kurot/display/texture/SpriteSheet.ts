import { Texture } from './Texture.js';

/**
 * Named Texture views sharing one page's BitmapData and resolution.
 * Disposing the sheet disposes the page; coordinate shared users beforehand.
 */
export class SpriteSheet {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _texture: Texture;
	private _bitmapX: number;
	private _bitmapY: number;
	private _textureMap = new Map<string, Texture>();

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(texture: Texture) {
		this._texture = texture;
		this._bitmapX = texture.bitmapX - texture.offsetX / texture.pixelScale;
		this._bitmapY = texture.bitmapY - texture.offsetY / texture.pixelScale;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Returns a previously created named view, or undefined. It performs no
	 * network request and does not create a frame when a name is missing.
	 */
	public getTexture(name: string): Texture | undefined {
		return this._textureMap.get(name);
	}

	/**
	 * Creates a view using source-pixel coordinates, trim offsets and original
	 * frame dimensions. Logical dimensions inherit the page's resolution.
	 */
	public createTexture(
		name: string,
		bitmapX: number,
		bitmapY: number,
		bitmapWidth: number,
		bitmapHeight: number,
		offsetX = 0,
		offsetY = 0,
		textureWidth?: number,
		textureHeight?: number,
	): Texture {
		const tw = textureWidth ?? offsetX + bitmapWidth;
		const th = textureHeight ?? offsetY + bitmapHeight;
		const texture = new Texture(this._texture.resolution);
		texture.disposeBitmapData = false;
		texture.bitmapData = this._texture.bitmapData;
		texture.initData(
			this._bitmapX + bitmapX,
			this._bitmapY + bitmapY,
			bitmapWidth,
			bitmapHeight,
			offsetX,
			offsetY,
			tw,
			th,
			this._texture.sourceWidth,
			this._texture.sourceHeight,
		);
		this._textureMap.set(name, texture);
		return texture;
	}

	/**
	 * Disposes the underlying page texture. Child views are non-owning and
	 * must no longer be rendered once the shared page source is released.
	 */
	public dispose(): void {
		this._texture.dispose();
	}
}
