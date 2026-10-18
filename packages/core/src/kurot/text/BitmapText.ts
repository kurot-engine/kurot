import { layoutBitmapText } from '@kurot/bitmap-font';
import type { BitmapTextLayout, PositionedBitmapGlyph } from '@kurot/bitmap-font';
import { DisplayObject, RenderObjectType } from '../display/DisplayObject.js';
import type { Rectangle } from '../geom/Rectangle.js';
import type { BitmapFont } from './BitmapFont.js';

/**
 * Draws atlas glyphs directly through WebGL batching or Canvas 2D.
 * Width wraps by code point; use multiline=false for one unwrapped line.
 * Fonts are borrowed. Missing glyphs are skipped; U+0020 has a fallback advance.
 */
export class BitmapText extends DisplayObject {
	// ── Static fields ─────────────────────────────────────────────────────────
	/**
	 * @deprecated Font layout uses its explicit spaceAdvance metric.
	 * Set that metric in font data before constructing a font.
	 */
	public static EMPTY_FACTOR = 0.33;

	// ── Instance fields ──────────────────────────────────────────────────────
	private _text = '';
	private _font?: BitmapFont;
	private _lineSpacing = 0;
	private _letterSpacing = 0;
	private _textAlign: 'left' | 'center' | 'right' = 'left';
	private _verticalAlign: 'top' | 'middle' | 'bottom' = 'middle';
	private _smoothing = true;
	private _multiline = true;
	private _layout?: BitmapTextLayout;

	// ── Constructor ──────────────────────────────────────────────────────────
	public constructor() {
		super();
		this.$renderObjectType = RenderObjectType.BITMAP_TEXT;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────
	/**
	 * Logical layout width, automatically measured until assigned. NaN restores
	 * automatic width. Negative/non-finite values other than NaN throw RangeError;
	 * a finite width constrains wrapping while multiline is enabled.
	 */
	public override get width(): number {
		return super.width;
	}
	public override set width(value: number) {
		if (Object.is(this.$explicitWidth, value)) return;
		if (!Number.isNaN(value) && (!Number.isFinite(value) || value < 0)) throw new RangeError('BitmapText.width must be nonnegative or NaN.');
		this.$explicitWidth = value;
		this._invalidate();
	}
	/**
	 * Logical layout height, automatically measured until assigned. NaN restores
	 * automatic height. Negative/non-finite values other than NaN throw RangeError;
	 * verticalAlign positions the bitmap-font line block in this frame.
	 */
	public override get height(): number {
		return super.height;
	}
	public override set height(value: number) {
		if (Object.is(this.$explicitHeight, value)) return;
		if (!Number.isNaN(value) && (!Number.isFinite(value) || value < 0)) throw new RangeError('BitmapText.height must be nonnegative or NaN.');
		this.$explicitHeight = value;
		this._invalidate();
	}
	/**
	 * Text to lay out, initially ''. Missing glyphs are skipped rather than loaded
	 * or replaced automatically; space can use the font's fallback advance.
	 */
	public get text(): string {
		return this._text;
	}
	public set text(value: string) {
		if (this._text === value) return;
		this._text = value;
		this._invalidate();
	}
	/**
	 * Borrowed BitmapFont, initially undefined (empty layout). Clearing or replacing
	 * it does not dispose font textures. The resource/view owner coordinates font
	 * lifetime across all BitmapText instances that share it.
	 */
	public get font(): BitmapFont | undefined {
		return this._font;
	}
	public set font(value: BitmapFont | undefined) {
		if (this._font === value) return;
		this._font = value;
		this._invalidate();
	}
	/**
	 * Extra logical pixels between rows, initially 0. Negative or non-finite
	 * values throw RangeError; font-native row metrics remain in effect.
	 */
	public get lineSpacing(): number {
		return this._lineSpacing;
	}
	public set lineSpacing(value: number) {
		if (this._lineSpacing === value) return;
		if (!Number.isFinite(value) || value < 0) throw new RangeError('BitmapText.lineSpacing must be finite and nonnegative.');
		this._lineSpacing = value;
		this._invalidate();
	}
	/**
	 * Additional logical pixels between glyph advances, initially 0.
	 * Negative spacing is allowed; non-finite values throw RangeError.
	 */
	public get letterSpacing(): number {
		return this._letterSpacing;
	}
	public set letterSpacing(value: number) {
		if (this._letterSpacing === value) return;
		if (!Number.isFinite(value)) throw new RangeError('BitmapText.letterSpacing must be finite.');
		this._letterSpacing = value;
		this._invalidate();
	}
	/**
	 * Line alignment inside the logical width, initially 'left'. Invalid values
	 * throw RangeError. This does not position the display object in its parent.
	 */
	public get textAlign(): 'left' | 'center' | 'right' {
		return this._textAlign;
	}
	public set textAlign(value: 'left' | 'center' | 'right') {
		if (this._textAlign === value) return;
		if (!['left', 'center', 'right'].includes(value)) throw new RangeError('Invalid bitmap text alignment.');
		this._textAlign = value;
		this._invalidate();
	}
	/**
	 * Bitmap-font line-block alignment inside the logical height, initially
	 * 'middle'. Invalid values throw RangeError; glyph/line metrics come from the font.
	 */
	public get verticalAlign(): 'top' | 'middle' | 'bottom' {
		return this._verticalAlign;
	}
	public set verticalAlign(value: 'top' | 'middle' | 'bottom') {
		if (this._verticalAlign === value) return;
		if (!['top', 'middle', 'bottom'].includes(value)) throw new RangeError('Invalid bitmap text vertical alignment.');
		this._verticalAlign = value;
		this._invalidate();
	}
	/**
	 * Whether glyph textures use smoothed sampling, true by default.
	 * Set false for nearest-neighbor pixel art; this does not change layout metrics.
	 */
	public get smoothing(): boolean {
		return this._smoothing;
	}
	public set smoothing(value: boolean) {
		if (this._smoothing === value) return;
		this._smoothing = value;
		this.$markDirty();
	}
	/**
	 * Whether hard breaks and width wrapping are enabled, true by default.
	 * false uses one unwrapped line; it does not choose vertical alignment.
	 */
	public get multiline(): boolean {
		return this._multiline;
	}
	public set multiline(value: boolean) {
		if (this._multiline === value) return;
		this._multiline = value;
		this._invalidate();
	}
	/**
	 * Current bitmap-font layout width in logical units, or 0 without a font.
	 * This reports layout content rather than transformed screen-space width.
	 */
	public get textWidth(): number {
		return this.getLayout().width;
	}
	/**
	 * Current bitmap-font layout height in logical units, or 0 without a font.
	 * This is independent of an explicitly assigned height.
	 */
	public get textHeight(): number {
		return this.getLayout().height;
	}

	// ── Public methods ───────────────────────────────────────────────────────
	/**
	 * Returns the cached layout for current text/font/constraints, or an empty
	 * layout without a font. Treat returned layout data as read-only; it is shared
	 * with rendering until a property invalidates the cache.
	 */
	public getLayout(): BitmapTextLayout {
		this._layout ??= this.measureText(this.$explicitWidth, this.$explicitHeight);
		return this._layout;
	}
	/**
	 * Measures with independent constraints without changing the rendered field.
	 * NaN means unconstrained; font, spacing, alignment and multiline are retained.
	 */
	public measureText(width: number = NaN, height: number = NaN): BitmapTextLayout {
		return this._font
			? layoutBitmapText(this._font.data, this._text, {
					width: Number.isNaN(width) ? undefined : width,
					height: Number.isNaN(height) ? undefined : height,
					lineSpacing: this._lineSpacing,
					letterSpacing: this._letterSpacing,
					textAlign: this._textAlign,
					verticalAlign: this._verticalAlign,
					multiline: this._multiline,
				})
			: { glyphs: [], lines: [], width: 0, height: 0, startX: 0, startY: 0, bounds: { x: 0, y: 0, width: 0, height: 0 } };
	}
	/**
	 * Read-only glyph placements from the current cached layout. Coordinates are
	 * local logical units; do not mutate or retain them as a live subscription to
	 * future text changes.
	 */
	public getGlyphs(): readonly PositionedBitmapGlyph[] {
		return this.getLayout().glyphs;
	}
	public getTextLines(): string[] {
		return this.getLayout().lines.map(line => line.text);
	}
	public getTextLinesWidth(): number[] {
		return this.getLayout().lines.map(line => line.width);
	}
	public getLineHeights(): number[] {
		return this.getLayout().lines.map(line => line.height);
	}
	public getTextStartX(): number {
		return this.getLayout().startX;
	}
	public getTextStartY(): number {
		return this.getLayout().startY;
	}

	// ── Override methods ─────────────────────────────────────────────────────
	public override $measureContentBounds(bounds: Rectangle): void {
		const measured = this.getLayout().bounds;
		bounds.setTo(measured.x, measured.y, measured.width, measured.height);
	}

	// ── Private methods ──────────────────────────────────────────────────────
	private _invalidate(): void {
		this._layout = undefined;
		this.$renderDirty = true;
		this.$markDirty();
	}
}
