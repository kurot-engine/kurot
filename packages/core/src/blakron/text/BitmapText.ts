import { DisplayObject, RenderObjectType } from '../display/DisplayObject.js';
import { Rectangle } from '../geom/Rectangle.js';
import { HorizontalAlign } from './enums/HorizontalAlign.js';
import { VerticalAlign } from './enums/VerticalAlign.js';
import type { BitmapFont } from './BitmapFont.js';

/**
 * Renders text using a BitmapFont (texture atlas), avoiding system font rendering differences.
 */
export class BitmapText extends DisplayObject {
	public static EMPTY_FACTOR = 0.33;

	private _text = '';
	private _font?: BitmapFont;
	private _lineSpacing = 0;
	private _letterSpacing = 0;
	private _textAlign: HorizontalAlign = HorizontalAlign.LEFT;
	private _verticalAlign: VerticalAlign = VerticalAlign.TOP;

	// Width/Height affect line-breaking, so invalidate text when they change.
	public override set width(value: number) {
		const v = isNaN(value) ? NaN : value;
		if (this.$explicitWidth === v) return;
		this.$explicitWidth = v;
		this._invalidate();
	}

	public override set height(value: number) {
		const v = isNaN(value) ? NaN : value;
		if (this.$explicitHeight === v) return;
		this.$explicitHeight = v;
		this._invalidate();
	}
	private _smoothing = true;

	private _textLinesChanged = false;
	private _textLines: string[] = [];
	private _textLinesWidth: number[] = [];
	private _lineHeights: number[] = [];
	private _textWidth = 0;
	private _textHeight = 0;
	private _textStartX = 0;
	private _textStartY = 0;

	public get text(): string {
		return this._text;
	}
	public set text(value: string) {
		const v = value ?? '';
		if (this._text === v) return;
		this._text = v;
		this._invalidate();
	}

	public get font(): BitmapFont | undefined {
		return this._font;
	}
	public set font(value: BitmapFont | undefined) {
		if (this._font === value) return;
		this._font = value;
		this._invalidate();
	}

	public get lineSpacing(): number {
		return this._lineSpacing;
	}
	public set lineSpacing(value: number) {
		if (this._lineSpacing === value) return;
		this._lineSpacing = value;
		this._invalidate();
	}

	public get letterSpacing(): number {
		return this._letterSpacing;
	}
	public set letterSpacing(value: number) {
		if (this._letterSpacing === value) return;
		this._letterSpacing = value;
		this._invalidate();
	}

	public get textAlign(): HorizontalAlign {
		return this._textAlign;
	}
	public set textAlign(value: HorizontalAlign) {
		if (this._textAlign === value) return;
		this._textAlign = value;
		this._invalidate();
	}

	public get verticalAlign(): VerticalAlign {
		return this._verticalAlign;
	}
	public set verticalAlign(value: VerticalAlign) {
		if (this._verticalAlign === value) return;
		this._verticalAlign = value;
		this._invalidate();
	}

	public get smoothing(): boolean {
		return this._smoothing;
	}
	public set smoothing(value: boolean) {
		if (this._smoothing === value) return;
		this._smoothing = value;
		this.$markDirty();
	}

	public get textWidth(): number {
		this._ensureLines();
		return this._textWidth;
	}
	public get textHeight(): number {
		this._ensureLines();
		return this._textHeight;
	}

	override $measureContentBounds(bounds: Rectangle): void {
		this._ensureLines();
		if (this._textLines.length === 0) {
			bounds.setEmpty();
		} else {
			bounds.setTo(this._textStartX, this._textStartY, this._textWidth, this._textHeight);
		}
	}

	/** @internal Returns computed text lines for rendering. */
	getTextLines(): string[] {
		return this._ensureLines();
	}
	/** @internal Per-line widths for rendering. */
	getTextLinesWidth(): number[] {
		this._ensureLines();
		return this._textLinesWidth;
	}
	/** @internal Per-line heights for rendering. */
	getLineHeights(): number[] {
		this._ensureLines();
		return this._lineHeights;
	}
	/** @internal Text start X offset after alignment. */
	getTextStartX(): number {
		this._ensureLines();
		return this._textStartX;
	}
	/** @internal Text start Y offset after alignment. */
	getTextStartY(): number {
		this._ensureLines();
		return this._textStartY;
	}

	private _invalidate(): void {
		this._textLinesChanged = true;
		this.$renderDirty = true;
		this.$markDirty();
	}

	private _ensureLines(): string[] {
		if (!this._textLinesChanged) return this._textLines;
		this._textLinesChanged = false;
		this._textLines = [];
		this._textLinesWidth = [];
		this._lineHeights = [];
		this._textWidth = 0;
		this._textHeight = 0;

		const font = this._font;
		if (!this._text || !font) return this._textLines;

		const hasWidthSet = !isNaN(this.$explicitWidth);
		const fieldWidth = this.$explicitWidth;
		const fieldHeight = this.$explicitHeight;
		const emptyHeight = font.getFirstCharHeight();
		const emptyWidth = Math.ceil(emptyHeight * BitmapText.EMPTY_FACTOR);
		const textArr = this._text.split(/(?:\r\n|\r|\n)/);

		let totalWidth = 0;
		let totalHeight = 0;

		const pushLine = (str: string, lh: number, lw: number): boolean => {
			if (!isNaN(fieldHeight) && this._textLines.length > 0 && totalHeight > fieldHeight) return false;
			totalHeight += lh + this._lineSpacing;
			this._textLines.push(str);
			this._lineHeights.push(lh);
			this._textLinesWidth.push(lw);
			totalWidth = Math.max(lw, totalWidth);
			return true;
		};

		for (let i = 0; i < textArr.length; i++) {
			let line = textArr[i];
			let len = line.length;
			let lineHeight = 0;
			let xPos = 0;
			let isFirstChar = true;

			for (let j = 0; j < len; j++) {
				if (!isFirstChar) xPos += this._letterSpacing;
				const ch = line.charAt(j);
				const texture = font.getTexture(ch);
				let texW: number;
				let texH: number;

				if (!texture) {
					if (ch === ' ') {
						texW = emptyWidth;
						texH = emptyHeight;
					} else {
						if (isFirstChar) isFirstChar = false;
						continue;
					}
				} else {
					texW = texture.textureWidth;
					texH = texture.textureHeight;
				}

				if (isFirstChar) isFirstChar = false;

				if (hasWidthSet && j > 0 && xPos + texW > fieldWidth) {
					if (!pushLine(line.substring(0, j), lineHeight, xPos)) break;
					line = line.substring(j);
					len = line.length;
					j = 0;
					xPos = len === 1 ? texW : font.getConfig(ch, 'xadvance') || texW;
					lineHeight = texH;
					continue;
				}

				xPos += j === len - 1 ? texW : font.getConfig(ch, 'xadvance') || texW;
				lineHeight = Math.max(texH, lineHeight);
			}

			if (!isNaN(fieldHeight) && i > 0 && totalHeight > fieldHeight) break;
			pushLine(line, lineHeight, xPos);
		}

		this._textWidth = totalWidth;
		this._textHeight = Math.max(0, totalHeight - this._lineSpacing);

		this._textStartX = 0;
		this._textStartY = 0;
		if (hasWidthSet && fieldWidth > totalWidth) {
			if (this._textAlign === HorizontalAlign.RIGHT) this._textStartX = fieldWidth - totalWidth;
			else if (this._textAlign === HorizontalAlign.CENTER)
				this._textStartX = Math.floor((fieldWidth - totalWidth) / 2);
		}
		if (!isNaN(fieldHeight) && fieldHeight > this._textHeight) {
			if (this._verticalAlign === VerticalAlign.BOTTOM) this._textStartY = fieldHeight - this._textHeight;
			else if (this._verticalAlign === VerticalAlign.MIDDLE)
				this._textStartY = Math.floor((fieldHeight - this._textHeight) / 2);
		}

		return this._textLines;
	}
}
