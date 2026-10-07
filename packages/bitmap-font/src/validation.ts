import type { BitmapFontData, BitmapGlyph } from './types.js';

export function readRecord(value: unknown, label: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
	return value as Record<string, unknown>;
}

export function readNumber(value: unknown, label: string, minimum: number = -Infinity): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) throw new RangeError(`${label} must be finite and >= ${minimum}.`);
	return value;
}

export function readCharacter(value: string): string {
	const code = value.codePointAt(0);
	if ([...value].length !== 1 || code === undefined || (code >= 0xd800 && code <= 0xdfff) || /[\r\n\u2028\u2029]/u.test(value)) {
		throw new TypeError('Glyph keys must contain one Unicode scalar other than a line separator.');
	}
	return value;
}

/**
 * Validates and copies native version-1 data into a deeply frozen snapshot.
 * Caller-owned editor records remain mutable and are never changed.
 */
export function validateBitmapFont(value: unknown): BitmapFontData {
	const source = readRecord(value, 'Bitmap font');
	if (source.version !== 1) throw new RangeError('Unsupported bitmap font version; expected 1.');
	const lineHeight = readNumber(source.lineHeight, 'lineHeight', Number.MIN_VALUE);
	const baseline = readNumber(source.baseline, 'baseline', 0);
	const spaceAdvance = readNumber(source.spaceAdvance, 'spaceAdvance', 0);
	const glyphs: Record<string, BitmapGlyph> = {};
	for (const [character, raw] of Object.entries(readRecord(source.glyphs, 'glyphs'))) {
		readCharacter(character);
		const glyph = readRecord(raw, `glyph ${character}`);
		glyphs[character] = Object.freeze({
			x: readNumber(glyph.x, 'x', 0),
			y: readNumber(glyph.y, 'y', 0),
			width: readNumber(glyph.width, 'width', 0),
			height: readNumber(glyph.height, 'height', 0),
			xOffset: readNumber(glyph.xOffset, 'xOffset'),
			yOffset: readNumber(glyph.yOffset, 'yOffset'),
			xAdvance: readNumber(glyph.xAdvance, 'xAdvance', 0),
			logicalWidth: readNumber(glyph.logicalWidth, 'logicalWidth', 0),
			logicalHeight: readNumber(glyph.logicalHeight, 'logicalHeight', 0),
		});
	}
	const kernings: Record<string, number> = {};
	for (const [pair, amount] of Object.entries(readRecord(source.kernings, 'kernings'))) {
		const codes = pair.split(',').map(Number);
		if (codes.length !== 2 || codes.some(code => !Number.isInteger(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) || codes.join(',') !== pair) {
			throw new TypeError(`Invalid kerning pair: ${pair}.`);
		}
		if (!Object.hasOwn(glyphs, String.fromCodePoint(codes[0]!)) || !Object.hasOwn(glyphs, String.fromCodePoint(codes[1]!))) {
			throw new TypeError(`Kerning pair ${pair} references a missing glyph.`);
		}
		kernings[pair] = readNumber(amount, 'kerning amount');
	}
	const data = { version: 1 as const, lineHeight, baseline, spaceAdvance, glyphs: Object.freeze(glyphs), kernings: Object.freeze(kernings) };
	if (source.file === undefined) return Object.freeze(data);
	if (typeof source.file !== 'string' || source.file.trim().length === 0) throw new TypeError('file must be a nonempty string.');
	return Object.freeze({ ...data, file: source.file });
}
