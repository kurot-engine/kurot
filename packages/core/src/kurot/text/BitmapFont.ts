import { parseBitmapFont } from '@kurot/bitmap-font';
import type { BitmapFontData } from '@kurot/bitmap-font';
import { SpriteSheet } from '../display/texture/SpriteSheet.js';
import { textureScaleFactor } from '../display/texture/Texture.js';
import type { Texture } from '../display/texture/Texture.js';

export interface BitmapFontOptions {
	/**
	 * Defaults to true. Set false when the page texture is owned elsewhere.
	 */
	readonly ownsTexture?: boolean;
}

/**
 * Texture-backed, single-page font. Font data is an immutable snapshot;
 * destroying a font invalidates its glyph views. Do not destroy fonts in use.
 */
export class BitmapFont extends SpriteSheet {
	// ── Instance fields ──────────────────────────────────────────────────────
	public readonly data: BitmapFontData;
	private readonly _ownsTexture: boolean;
	private _disposed = false;

	// ── Constructor ──────────────────────────────────────────────────────────
	public constructor(texture: Texture, config: unknown, options: BitmapFontOptions = {}) {
		super(texture);
		this.data = parseBitmapFont(config);
		this._ownsTexture = options.ownsTexture ?? true;
		if (textureScaleFactor !== 1) throw new RangeError('BitmapFont requires textureScaleFactor=1.');
		if (
			texture.bitmapX !== 0 ||
			texture.bitmapY !== 0 ||
			texture.rotated ||
			texture.offsetX !== 0 ||
			texture.offsetY !== 0 ||
			texture.bitmapWidth !== texture.sourceWidth ||
			texture.bitmapHeight !== texture.sourceHeight
		) {
			throw new RangeError('BitmapFont requires a complete, unrotated page texture.');
		}
		for (const glyph of Object.values(this.data.glyphs)) {
			if (glyph.x + glyph.width > texture.bitmapWidth || glyph.y + glyph.height > texture.bitmapHeight) {
				throw new RangeError('Bitmap font glyph exceeds its page texture.');
			}
		}
	}

	// ── Public methods ───────────────────────────────────────────────────────
	public getConfig(name: string, key: 'x' | 'y' | 'w' | 'h' | 'offX' | 'offY' | 'sourceW' | 'sourceH' | 'xadvance'): number {
		const glyph = this.data.glyphs[name];
		if (!glyph) return 0;
		const values = {
			x: glyph.x,
			y: glyph.y,
			w: glyph.width,
			h: glyph.height,
			offX: glyph.xOffset,
			offY: glyph.yOffset,
			sourceW: glyph.logicalWidth,
			sourceH: glyph.logicalHeight,
			xadvance: glyph.xAdvance,
		};
		return values[key];
	}

	public getFirstCharHeight(): number {
		return this.data.lineHeight;
	}

	// ── Override methods ─────────────────────────────────────────────────────
	public override getTexture(name: string): Texture | undefined {
		if (this._disposed) return undefined;
		const cached = super.getTexture(name);
		if (cached) return cached;
		const glyph = this.data.glyphs[name];
		if (!glyph) return undefined;
		return this.createTexture(name, glyph.x, glyph.y, glyph.width, glyph.height, glyph.xOffset, glyph.yOffset, glyph.logicalWidth, glyph.logicalHeight);
	}

	public override dispose(): void {
		if (this._disposed) return;
		this._disposed = true;
		if (this._ownsTexture) {
			super.dispose();
		}
	}
}
