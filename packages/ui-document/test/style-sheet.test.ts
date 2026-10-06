import { describe, expect, it } from 'vitest';
import {
	getUIStyleColor,
	getUIStyleFontFamily,
	parseUIDocument,
	parseUIStyleSheet,
	resolveUIStyleColors,
	serializeUIDocument,
} from '../src/index.js';

const style = {
	schemaVersion: 1,
	fonts: {
		default: 'primary',
		families: {
			primary: { fallback: ['Arial', 'sans-serif'], faces: [{ url: 'fonts/Regular.ttf', weight: 400 }] },
		},
	},
	colors: { 'disabled-text': '#999999', black: '#000000' },
};

const source =
	'<Skin xmlns="https://kurot.dev/ui/1" class="Test" states="up,disabled"><Group><Label id="label" text="@style:colors:disabled-text" textColor="#FFA500" textColor.disabled="@style:colors:disabled-text" /><EditableText id="input" textColor="@style:colors:black" /></Group></Skin>';

describe('project style colors', () => {
	it('parses immutable numeric colors without changing font aliases', () => {
		const parsed = parseUIStyleSheet(style);
		expect(parsed.colors).toEqual({ 'disabled-text': 0x999999, black: 0 });
		expect(Object.isFrozen(parsed.colors)).toBe(true);
		expect(getUIStyleColor(parsed.colors, 'black')).toBe(0);
		expect(getUIStyleFontFamily(parsed)).toBe('"kurot-primary", "Arial", sans-serif');
		expect(() => getUIStyleColor(parsed.colors, 'constructor')).toThrow('Unknown project color');
	});

	it('allows an absent palette until a skin references a color', () => {
		const { colors: _colors, ...fontsOnly } = style;
		expect(parseUIStyleSheet(fontsOnly).colors).toEqual({});
		expect(() => resolveUIStyleColors(parseUIDocument(source), {})).toThrow('disabled-text');
	});

	it.each([
		null,
		[],
		{ disabled: '#fff' },
		{ disabled: '#999999FF' },
		{ disabled: '0x999999' },
		{ disabled: 0x999999 },
		{ 'Disabled Text': '#999999' },
	])('rejects invalid palette %j', colors => {
		expect(() => parseUIStyleSheet({ ...style, colors })).toThrow('style.colors');
	});

	it('resolves nested colors and inactive state colors in a copy while retaining authored references', () => {
		const document = parseUIDocument(source);
		const before = serializeUIDocument(document);
		const resolved = resolveUIStyleColors(document, parseUIStyleSheet(style).colors);
		expect(resolved.root.children[0]?.children[0]?.properties.text).toBe('@style:colors:disabled-text');
		expect(resolved.root.children[0]?.children[0]?.properties.textColor).toBe(0xffa500);
		expect(resolved.root.children[0]?.children[1]?.properties.textColor).toBe(0);
		expect(resolved.contract.states.disabled?.overrides[0]?.value).toBe(0x999999);
		expect(serializeUIDocument(document)).toBe(before);
		expect(before).toContain('textColor.disabled="@style:colors:disabled-text"');
	});

	it('reports missing state color references with an exact semantic location', () => {
		expect(() => resolveUIStyleColors(parseUIDocument(source), { black: 0 })).toThrow(
			'$.contract.states.disabled.overrides[0].value',
		);
	});
});
