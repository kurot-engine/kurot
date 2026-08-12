import { Texture } from './Texture.js';

export class SpriteSheet {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _texture: Texture;
	private _bitmapX: number;
	private _bitmapY: number;
	private _textureMap = new Map<string, Texture>();

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(texture: Texture) {
		this._texture = texture;
		this._bitmapX = texture.bitmapX - texture.offsetX;
		this._bitmapY = texture.bitmapY - texture.offsetY;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public getTexture(name: string): Texture | undefined {
		return this._textureMap.get(name);
	}

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
		const texture = new Texture();
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

	public dispose(): void {
		this._texture.dispose();
	}
}
