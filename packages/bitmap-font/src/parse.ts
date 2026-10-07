import type { BitmapFontData } from './types.js';
import { parseEgretFont } from './parse-egret.js';
import { parseBMFont } from './parse-bmfont.js';
import { readRecord, validateBitmapFont } from './validation.js';

/**
 * Accepts native version-1 JSON, Egret frames JSON, or single-page BMFont text.
 * JSON text is decoded before format detection. Invalid data throws.
 */
export function parseBitmapFont(source: unknown): BitmapFontData {
	if (typeof source === 'string') {
		const text = source.trim();
		if (!text.startsWith('{')) return parseBMFont(text);
		return parseBitmapFont(JSON.parse(text) as unknown);
	}
	const record = readRecord(source, 'Bitmap font');
	return record.version === undefined ? parseEgretFont(record) : validateBitmapFont(record);
}

/**
 * Emits deterministic native JSON after validation; does not mutate the input.
 */
export function serializeBitmapFont(source: BitmapFontData): string {
	const data = validateBitmapFont(source);
	const sort = <T>(record: Readonly<Record<string, T>>): Record<string, T> =>
		Object.fromEntries(
			Object.keys(record)
				.sort()
				.map(key => [key, record[key]!]),
		);
	return JSON.stringify({ ...data, glyphs: sort(data.glyphs), kernings: sort(data.kernings) }, undefined, 2) + '\n';
}
