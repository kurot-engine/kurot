/**
 * Single-page, unrotated glyph geometry. Coordinates use atlas pixels;
 * offsets, advances and logical dimensions use font design units.
 */
export interface BitmapGlyph {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly xOffset: number;
	readonly yOffset: number;
	readonly xAdvance: number;
	readonly logicalWidth: number;
	readonly logicalHeight: number;
}

/**
 * Versioned interchange data. Parsed values are deeply frozen snapshots.
 * file may be omitted when a caller supplies its own texture.
 * Kerning keys are decimal Unicode code point pairs: "65,86".
 */
export interface BitmapFontData {
	readonly version: 1;
	readonly file?: string;
	readonly lineHeight: number;
	readonly baseline: number;
	readonly spaceAdvance: number;
	readonly glyphs: Readonly<Record<string, BitmapGlyph>>;
	readonly kernings: Readonly<Record<string, number>>;
}

export interface BitmapTextLayoutOptions {
	/**
	 * Undefined means unconstrained. Zero is a real constraint.
	 * Width wraps by Unicode code point; height admits complete line boxes.
	 */
	readonly width?: number;
	readonly height?: number;
	readonly letterSpacing?: number;
	readonly lineSpacing?: number;
	readonly textAlign?: 'left' | 'center' | 'right';
	readonly verticalAlign?: 'top' | 'middle' | 'bottom';
	readonly multiline?: boolean;
}

export interface PositionedBitmapGlyph {
	readonly character: string;
	/**
	 * UTF-16 source offset, suitable for indexing the original JavaScript string.
	 */
	readonly index: number;
	readonly line: number;
	/**
	 * Pen position before applying the glyph's xOffset/yOffset.
	 */
	readonly x: number;
	readonly y: number;
}

export interface BitmapTextLine {
	readonly text: string;
	readonly width: number;
	readonly height: number;
}

export interface BitmapTextLayout {
	readonly glyphs: readonly PositionedBitmapGlyph[];
	readonly lines: readonly BitmapTextLine[];
	readonly width: number;
	readonly height: number;
	readonly startX: number;
	readonly startY: number;
	/**
	 * Union of logical line boxes and painted glyphs, including negative bearings.
	 */
	readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}
