import type { BitmapFontData, BitmapGlyph } from './types.js';
import { readRecord, readNumber, validateBitmapFont } from './validation.js';

export function parseEgretFont(value: unknown): BitmapFontData {
	const source = readRecord(value, 'Egret bitmap font');
	const glyphs: Record<string, BitmapGlyph> = {};
	let lineHeight = 0;
	for (const [character, raw] of Object.entries(readRecord(source.frames, 'frames'))) {
		const frame = readRecord(raw, `frame ${character}`);
		const width = readNumber(frame.w, 'w', 0);
		const height = readNumber(frame.h, 'h', 0);
		const xOffset = readNumber(withDefault(frame.offX, 0), 'offX');
		const yOffset = readNumber(withDefault(frame.offY, 0), 'offY');
		const logicalWidth = readNumber(withDefault(frame.sourceW, Math.max(0, xOffset + width)), 'sourceW', 0);
		const logicalHeight = readNumber(withDefault(frame.sourceH, Math.max(0, yOffset + height)), 'sourceH', 0);
		glyphs[character] = {
			x: readNumber(frame.x, 'x', 0),
			y: readNumber(frame.y, 'y', 0),
			width,
			height,
			xOffset,
			yOffset,
			xAdvance: readNumber(withDefault(frame.xadvance, logicalWidth), 'xadvance', 0),
			logicalWidth,
			logicalHeight,
		};
		lineHeight = Math.max(lineHeight, logicalHeight);
	}
	lineHeight = readNumber(withDefault(source.lineHeight, lineHeight), 'lineHeight', Number.MIN_VALUE);
	return validateBitmapFont({
		version: 1,
		file: source.file,
		lineHeight,
		baseline: withDefault(source.baseline, lineHeight),
		spaceAdvance: withDefault(source.spaceAdvance, Math.ceil(lineHeight * 0.33)),
		glyphs,
		kernings: source.kernings === undefined ? {} : source.kernings,
	});
}

function withDefault(value: unknown, fallback: number): unknown {
	return value === undefined ? fallback : value;
}
