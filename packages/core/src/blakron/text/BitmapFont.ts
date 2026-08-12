import { SpriteSheet } from '../display/texture/SpriteSheet.js';
import type { Texture } from '../display/texture/Texture.js';

interface CharConfig {
	x: number;
	y: number;
	w: number;
	h: number;
	offX: number;
	offY: number;
	sourceW?: number;
	sourceH?: number;
	xadvance?: number;
}

/**
 * Bitmap font — a texture atlas for a font, used as the value of BitmapText.font.
 */
export class BitmapFont extends SpriteSheet {
	private _charList: Record<string, CharConfig> = {};
	private _firstCharHeight = 0;

	public constructor(texture: Texture, config: string | { frames: Record<string, CharConfig> }) {
		super(texture);
		if (typeof config === 'string') {
			this._charList = this._parseConfig(config);
		} else if (config?.frames) {
			this._charList = config.frames;
		}
	}

	public override getTexture(name: string): Texture | undefined {
		const cached = super.getTexture(name);
		if (cached) return cached;
		const c = this._charList[name];
		if (!c) return undefined;
		return this.createTexture(name, c.x, c.y, c.w, c.h, c.offX, c.offY, c.sourceW, c.sourceH);
	}

	public getConfig(name: string, key: keyof CharConfig): number {
		return (this._charList[name]?.[key] as number) ?? 0;
	}

	/** @internal Returns the height of the first character, used for space width calculation. */
	getFirstCharHeight(): number {
		if (this._firstCharHeight === 0) {
			for (const str in this._charList) {
				const c = this._charList[str];
				if (!c) continue;
				const sourceH = c.sourceH ?? (c.h ?? 0) + (c.offY ?? 0);
				if (sourceH <= 0) continue;
				this._firstCharHeight = sourceH;
				break;
			}
		}
		return this._firstCharHeight;
	}

	private _parseConfig(fntText: string): Record<string, CharConfig> {
		const lines = fntText.replace(/\r\n/g, '\n').split('\n');
		// Find the "chars count=N" line dynamically instead of assuming line index
		let charsCount = 0;
		let charsStartLine = -1;
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].startsWith('chars ')) {
				charsCount = this._getConfigByKey(lines[i], 'count');
				charsStartLine = i + 1;
				break;
			}
		}
		if (charsStartLine < 0) return {};
		const chars: Record<string, CharConfig> = {};
		for (let i = charsStartLine; i < charsStartLine + charsCount && i < lines.length; i++) {
			const line = lines[i];
			if (!line.startsWith('char ')) continue;
			const letter = String.fromCharCode(this._getConfigByKey(line, 'id'));
			chars[letter] = {
				x: this._getConfigByKey(line, 'x'),
				y: this._getConfigByKey(line, 'y'),
				w: this._getConfigByKey(line, 'width'),
				h: this._getConfigByKey(line, 'height'),
				offX: this._getConfigByKey(line, 'xoffset'),
				offY: this._getConfigByKey(line, 'yoffset'),
				xadvance: this._getConfigByKey(line, 'xadvance'),
			};
		}
		return chars;
	}

	private _getConfigByKey(configText: string, key: string): number {
		for (const item of configText.split(' ')) {
			if (item.startsWith(key + '=')) {
				return parseInt(item.substring(key.length + 1));
			}
		}
		return 0;
	}
}
