import type { BitmapFontData, BitmapGlyph } from './types.js';
import { readCharacter, validateBitmapFont } from './validation.js';

export function parseBMFont(source: string): BitmapFontData {
	const glyphs: Record<string, BitmapGlyph> = {};
	const kernings: Record<string, number> = {};
	let file: string | undefined;
	let lineHeight: number | undefined;
	let baseline: number | undefined;
	let expectedChars: number | undefined;
	let expectedKernings: number | undefined;
	let pageSeen = false;
	let commonSeen = false;
	for (const line of source.split(/\r\n|\r|\n/)) {
		const tag = line.trim().split(/\s/, 1)[0];
		const fields: Record<string, string> = {};
		for (const match of line.matchAll(/(\w+)=(?:"([^"]*)"|([^\s]+))/g)) {
			fields[match[1]!] = match[2] ?? match[3]!;
		}
		const number = (key: string): number => {
			const raw = fields[key];
			if (raw === undefined || raw.trim() === '' || !Number.isFinite(Number(raw))) throw new TypeError(`Invalid BMFont ${tag}.${key}.`);
			return Number(raw);
		};
		switch (tag) {
			case 'common': {
				if (commonSeen) throw new TypeError('Duplicate BMFont common record.');
				commonSeen = true;
				if (number('pages') !== 1 || (fields.packed !== undefined && number('packed') !== 0)) throw new RangeError('Only single-page, unpacked BMFont is supported.');
				lineHeight = number('lineHeight');
				baseline = number('base');
				break;
			}
			case 'page': {
				if (pageSeen || number('id') !== 0) throw new RangeError('Only BMFont page 0 is supported.');
				pageSeen = true;
				file = fields.file;
				break;
			}
			case 'chars': {
				expectedChars = number('count');
				break;
			}
			case 'char': {
				const id = number('id');
				if (!Number.isInteger(id) || id < 0 || id > 0x10ffff) throw new RangeError('Invalid BMFont character id.');
				const character = readCharacter(String.fromCodePoint(id));
				if (Object.hasOwn(glyphs, character)) throw new TypeError(`Duplicate BMFont glyph: ${id}.`);
				if (number('page') !== 0 || (fields.chnl !== undefined && number('chnl') !== 15)) throw new RangeError('Only full-color, page-0 BMFont glyphs are supported.');
				const width = number('width'),
					height = number('height'),
					xOffset = number('xoffset'),
					yOffset = number('yoffset'),
					xAdvance = number('xadvance');
				glyphs[character] = {
					x: number('x'),
					y: number('y'),
					width,
					height,
					xOffset,
					yOffset,
					xAdvance,
					logicalWidth: Math.max(0, xOffset + width, xAdvance),
					logicalHeight: Math.max(0, yOffset + height),
				};
				break;
			}
			case 'kernings': {
				expectedKernings = number('count');
				break;
			}
			case 'kerning': {
				const pair = `${number('first')},${number('second')}`;
				if (Object.hasOwn(kernings, pair)) throw new TypeError(`Duplicate BMFont kerning: ${pair}.`);
				kernings[pair] = number('amount');
				break;
			}
			case 'info':
			case '': {
				break;
			}
			default: {
				throw new TypeError(`Unsupported BMFont record: ${tag}.`);
			}
		}
	}
	if (!commonSeen || !pageSeen || !file) throw new TypeError('BMFont common and page records are required.');
	if (expectedChars !== Object.keys(glyphs).length || (expectedKernings !== undefined && expectedKernings !== Object.keys(kernings).length))
		throw new TypeError('BMFont record count mismatch.');
	return validateBitmapFont({ version: 1, file, lineHeight, baseline, spaceAdvance: glyphs[' ']?.xAdvance ?? Math.ceil((lineHeight ?? 0) * 0.33), glyphs, kernings });
}
