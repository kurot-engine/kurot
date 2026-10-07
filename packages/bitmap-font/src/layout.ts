import type { BitmapFontData, BitmapTextLayout, BitmapTextLayoutOptions, BitmapTextLine, PositionedBitmapGlyph } from './types.js';

/**
 * Shared code-point layout for runtime and editor previews. Missing glyphs
 * are skipped; a missing U+0020 advances by spaceAdvance. No word shaping.
 */
export function layoutBitmapText(font: BitmapFontData, text: string, options: BitmapTextLayoutOptions = {}): BitmapTextLayout {
	const { width, height, letterSpacing = 0, lineSpacing = 0, multiline = true, textAlign = 'left', verticalAlign = 'top' } = options;
	for (const value of [width, height]) {
		if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new RangeError('Layout constraints must be finite and nonnegative.');
	}
	if (!Number.isFinite(letterSpacing) || !Number.isFinite(lineSpacing) || font.lineHeight + lineSpacing <= 0) throw new RangeError('Invalid bitmap text spacing.');
	if (!['left', 'center', 'right'].includes(textAlign) || !['top', 'middle', 'bottom'].includes(verticalAlign)) throw new RangeError('Invalid bitmap text alignment.');
	const glyphs: PositionedBitmapGlyph[] = [];
	const lines: BitmapTextLine[] = [];
	let pen = 0,
		lineWidth = 0,
		lineText = '',
		previous: string | undefined;
	let index = 0,
		y = 0,
		stopped = text.length === 0 || height === 0;
	const finishLine = (): void => {
		lines.push({ text: lineText, width: lineWidth, height: font.lineHeight });
		pen = 0;
		lineWidth = 0;
		lineText = '';
		previous = undefined;
		y += font.lineHeight + lineSpacing;
	};
	const fitsLine = (): boolean => height === undefined || y + font.lineHeight <= height;
	if (!fitsLine()) {
		stopped = true;
	}
	const characters = [...text];
	for (let i = 0; !stopped && i < characters.length; i++) {
		const character = characters[i]!;
		const sourceIndex = index;
		index += character.length;
		if (/[\r\n\u2028\u2029]/u.test(character)) {
			if (character === '\r' && characters[i + 1] === '\n') {
				i++;
				index++;
			}
			finishLine();
			if (!multiline || !fitsLine()) {
				stopped = true;
			}
			continue;
		}
		const glyph = font.glyphs[character];
		if (!glyph && character !== ' ') {
			lineText += character;
			continue;
		}
		const spacing = previous === undefined ? 0 : letterSpacing + (font.kernings[`${previous.codePointAt(0)},${character.codePointAt(0)}`] ?? 0);
		let x = pen + spacing;
		const advance = glyph?.xAdvance ?? font.spaceAdvance;
		const logicalWidth = glyph?.logicalWidth ?? font.spaceAdvance;
		if (multiline && width !== undefined && previous !== undefined && Math.max(x + logicalWidth, x + advance) > width) {
			finishLine();
			if (!fitsLine()) {
				stopped = true;
				break;
			}
			x = 0;
		}
		if (glyph) {
			glyphs.push({ character, index: sourceIndex, line: lines.length, x, y });
		}
		lineText += character;
		pen = x + advance;
		lineWidth = Math.max(lineWidth, x + logicalWidth, pen);
		previous = character;
	}
	if (!stopped) {
		finishLine();
	}
	const measuredWidth = lines.reduce((maximum, line) => Math.max(maximum, line.width), 0);
	const measuredHeight = lines.length === 0 ? 0 : lines.length * font.lineHeight + (lines.length - 1) * lineSpacing;
	const alignOffset = (remaining: number, align: string): number =>
		align === 'right' || align === 'bottom' ? Math.max(0, remaining) : align === 'center' || align === 'middle' ? Math.max(0, remaining) / 2 : 0;
	const startY = alignOffset((height ?? measuredHeight) - measuredHeight, verticalAlign);
	const availableWidth = width ?? measuredWidth;
	const offsets = lines.map(line => alignOffset(availableWidth - line.width, textAlign));
	let minX = 0,
		minY = 0,
		maxX = 0,
		maxY = measuredHeight === 0 ? 0 : startY + measuredHeight;
	for (let i = 0; i < glyphs.length; i++) {
		const position = glyphs[i]!;
		const glyph = font.glyphs[position.character]!;
		const shifted = { ...position, x: position.x + offsets[position.line]!, y: position.y + startY };
		glyphs[i] = shifted;
		minX = Math.min(minX, shifted.x + glyph.xOffset);
		minY = Math.min(minY, shifted.y + glyph.yOffset);
		maxX = Math.max(maxX, shifted.x + glyph.xOffset + glyph.width);
		maxY = Math.max(maxY, shifted.y + glyph.yOffset + glyph.height);
	}
	for (let i = 0; i < lines.length; i++) {
		maxX = Math.max(maxX, offsets[i]! + lines[i]!.width);
	}
	return { glyphs, lines, width: measuredWidth, height: measuredHeight, startX: offsets[0] ?? 0, startY, bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } };
}
