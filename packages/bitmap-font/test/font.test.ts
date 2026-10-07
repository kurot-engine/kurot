import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { layoutBitmapText, parseBitmapFont, serializeBitmapFont, validateBitmapFont } from '../src/index.js';
import type { BitmapFontData } from '../src/index.js';

const raw = readFileSync(new URL('./fixtures/number-font.fnt', import.meta.url), 'utf8');
const numbers = parseBitmapFont(raw);
const bmfont = `info face="Test Font" size=12
common lineHeight=12 base=10 scaleW=64 scaleH=32 pages=1 packed=0
page id=0 file="test font.png"
chars count=3
char id=65 x=0 y=0 width=7 height=10 xoffset=-1 yoffset=1 xadvance=8 page=0 chnl=15
char id=86 x=8 y=0 width=7 height=10 xoffset=0 yoffset=1 xadvance=8 page=0 chnl=15
char id=128512 x=16 y=0 width=10 height=10 xoffset=0 yoffset=1 xadvance=11 page=0 chnl=15
kernings count=1
kerning first=65 second=86 amount=-2`;
const font = parseBitmapFont(bmfont);

describe('bitmap font interchange', () => {
	it('rejects explicit invalid optional JSON values instead of supplying defaults', () => {
		expect(() => parseBitmapFont('{"frames":{"A":{"x":0,"y":0,"w":4,"h":8,"offX":null}}}')).toThrow();
	});
	it('imports the actual number font without altering character geometry', () => {
		expect(Object.keys(numbers.glyphs)).toHaveLength(12);
		expect(numbers.file).toBe('number_font.png');
		expect(numbers.lineHeight).toBe(100);
		expect(numbers.glyphs['1']).toMatchObject({ width: 36, xOffset: 20, logicalWidth: 76, xAdvance: 76 });
		expect(numbers.glyphs['.']).toMatchObject({ yOffset: 64, logicalWidth: 30 });
	});
	it('reads BMFont Unicode ids, offsets, advances, baseline and kerning', () => {
		expect(font.file).toBe('test font.png');
		expect(font.baseline).toBe(10);
		expect(font.glyphs['😀']?.xAdvance).toBe(11);
		expect(font.kernings['65,86']).toBe(-2);
	});
	it('returns frozen snapshots and leaves editor-owned input untouched', () => {
		const source = JSON.parse(serializeBitmapFont(font)) as Record<string, unknown>;
		const snapshot = validateBitmapFont(source);
		expect(Object.isFrozen(snapshot)).toBe(true);
		expect(Object.isFrozen(snapshot.glyphs.A)).toBe(true);
		expect(Object.isFrozen(source)).toBe(false);
	});
	it('serializes canonical JSON and round-trips all metrics deterministically', () => {
		const output = serializeBitmapFont(font);
		expect(parseBitmapFont(output)).toEqual(font);
		expect(serializeBitmapFont(parseBitmapFont(output))).toBe(output);
	});
	it('uses zero advance intentionally rather than falling back to a glyph width', () => {
		const imported = parseBitmapFont({ frames: { A: { x: 0, y: 0, w: 4, h: 8, xadvance: 0 } } });
		expect(imported.glyphs.A?.xAdvance).toBe(0);
		expect(layoutBitmapText(imported, 'AA').glyphs.map(glyph => glyph.x)).toEqual([0, 0]);
	});
	it.each([
		bmfont.replace('pages=1', 'pages=2'),
		bmfont.replace('packed=0', 'packed=1'),
		bmfont.replace('page=0', 'page=1'),
		bmfont.replace('chars count=3', 'chars count=4'),
		bmfont.replace('id=128512', 'id=55296'),
		bmfont.replace('width=7', 'width=-7'),
		bmfont.replace('first=65', 'first=66'),
		bmfont.replace('base=10', 'base=NaN'),
	])('rejects unsupported or malformed BMFont input', input => {
		expect(() => parseBitmapFont(input)).toThrow();
	});
	it.each([
		{ ...font, version: 2 },
		{ ...font, lineHeight: 0 },
		{ ...font, baseline: Infinity },
		{ ...font, glyphs: { ab: font.glyphs.A } },
		{ ...font, file: '' },
		{ ...font, kernings: { '65,99': 1 } },
	])('validates native editor data before export', input => {
		expect(() => validateBitmapFont(input)).toThrow();
	});
});

describe('shared layout', () => {
	it('keeps original logical number widths and punctuation spacing', () => {
		const result = layoutBitmapText(numbers, '1,234.56');
		expect(result.width).toBe(6 * 76 + 2 * 30);
		expect(result.height).toBe(100);
		expect(result.glyphs[1]?.x).toBe(76);
	});
	it('applies kerning and tracks UTF-16 indices for supplementary characters', () => {
		const result = layoutBitmapText(font, 'AV😀A');
		expect(result.glyphs.map(glyph => glyph.x)).toEqual([0, 6, 14, 25]);
		expect(result.glyphs.map(glyph => glyph.index)).toEqual([0, 1, 2, 4]);
		expect(result.bounds.x).toBe(-1);
	});
	it('wraps by code point, resets kerning and places each line independently', () => {
		const result = layoutBitmapText(font, 'AVA', { width: 14, textAlign: 'right', lineSpacing: 2 });
		expect(result.lines.map(line => line.text)).toEqual(['AV', 'A']);
		expect(result.glyphs.map(glyph => [glyph.x, glyph.y])).toEqual([
			[0, 0],
			[6, 0],
			[6, 14],
		]);
		expect(result.height).toBe(26);
	});
	it('handles CRLF, blank lines and first-line-only mode', () => {
		expect(layoutBitmapText(font, 'A\r\n\nV').lines.map(line => line.text)).toEqual(['A', '', 'V']);
		expect(layoutBitmapText(font, 'AVA\nV', { width: 8, multiline: false }).lines.map(line => line.text)).toEqual(['AVA']);
	});
	it('admits complete lines under height constraints and distinguishes zero', () => {
		expect(layoutBitmapText(font, 'A\nV', { height: 12 }).glyphs).toHaveLength(1);
		expect(layoutBitmapText(font, 'A', { height: 0 }).glyphs).toHaveLength(0);
		expect(layoutBitmapText(font, 'A', { height: 11 }).height).toBe(0);
	});
	it('aligns per line and vertically without stretching the glyphs', () => {
		const result = layoutBitmapText(font, 'A', { width: 20, height: 24, textAlign: 'center', verticalAlign: 'bottom' });
		expect(result.glyphs[0]).toMatchObject({ x: 6, y: 12 });
	});
	it('advances fallback spaces and skips missing glyphs', () => {
		expect(layoutBitmapText(font, 'A? V').glyphs.map(glyph => glyph.x)).toEqual([0, 12]);
	});
	it('lays out a long editor preview without recursive or quadratic traversal', () => {
		const result = layoutBitmapText(font, 'A'.repeat(20000));
		expect(result.glyphs).toHaveLength(20000);
		expect(result.width).toBe(160000);
	});
	it('preserves negative glyph bearings in the painted bounds', () => {
		const data: BitmapFontData = { ...font, glyphs: { A: { ...font.glyphs.A!, yOffset: -3 } } };
		expect(layoutBitmapText(data, 'A').bounds).toEqual({ x: -1, y: -3, width: 9, height: 15 });
	});
	it.each([{ width: -1 }, { height: Infinity }, { letterSpacing: NaN }, { lineSpacing: -12 }])('rejects invalid layout settings', options => {
		expect(() => layoutBitmapText(font, 'A', options)).toThrow();
	});
});
