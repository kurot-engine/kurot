import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stage, TextEvent, TextField, TextFieldType, TouchEvent } from '../src/index.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';
import { getTextRenderPadding } from '../src/kurot/text/TextRenderBounds.js';
import { createTextMetrics } from './helpers/text-metrics.js';

const ink: Record<string, [number, number]> = {
	ABC: [0.7, 0], play: [0.45, 0.2], '开始游戏': [0.8, 0.1],
	'เริ่มเกม': [0.95, 0.15], ',': [-0.1, 0.25],
};
let inkScale = 1;
const context = {
	font: '', textBaseline: 'alphabetic', textAlign: 'left',
	save: vi.fn(), restore: vi.fn(), translate: vi.fn(),
	beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(),
	fillText: vi.fn(), strokeText: vi.fn(), fillRect: vi.fn(),
	measureText: vi.fn((text: string): TextMetrics => {
		const size = Number(context.font.match(/([\d.]+)px/)?.[1] ?? 20);
		const [ascent, descent] = ink[text] ?? [0, 0];
		return {
			...createTextMetrics(text.length * 10),
			fontBoundingBoxAscent: size * (text === '开始游戏' ? 1.1 : 0.8),
			fontBoundingBoxDescent: size * 0.2,
			actualBoundingBoxAscent: size * ascent * inkScale,
			actualBoundingBoxDescent: size * descent * inkScale,
		};
	}),
};
const drawing = context as unknown as CanvasRenderingContext2D;

function createField(text: string): TextField {
	const field = new TextField();
	field.size = 20;
	field.width = 180;
	field.height = 48;
	field.multiline = false;
	field.verticalAlign = 'middle';
	field.text = text;
	return field;
}

function paint(field: TextField): number[] {
	context.fillText.mockClear();
	new CanvasRenderer().renderTextFieldToContext(field, drawing, 0, 0);
	return context.fillText.mock.calls.map(call => call[2] as number);
}

beforeEach(() => {
	inkScale = 1;
	vi.clearAllMocks();
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawing);
});
afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe('shared alphabetic baselines and visual alignment', () => {
	it.each(Object.entries(ink))('centers the complete ink of %j without language-specific offsets', (text, extents) => {
		const field = createField(text);
		const [baseline] = paint(field);
		const top = baseline - extents[0] * field.size;
		const bottom = baseline + extents[1] * field.size;
		expect((top + bottom) / 2).toBe(24);
		expect(context.textBaseline).toBe('alphabetic');
		expect(field.textHeight).toBe(20);
		field.multiline = true;
		expect(paint(field)).toEqual([baseline]);
	});

	it('aligns mixed font sizes on one baseline using the union of run ink', () => {
		const field = createField('');
		field.textFlow = [{ text: 'ABC', style: { size: 32 } }, { text: 'play', style: { size: 14 } }];
		const baselines = paint(field);
		expect(baselines[0]).toBe(baselines[1]);
		expect((baselines[0] - 32 * 0.7 + baselines[1] + 14 * 0.2) / 2).toBeCloseTo(24);
		expect(field.textHeight).toBe(32);
	});

	it('centers a complete paragraph while preserving its relative baselines and spacing', () => {
		const field = createField('ABC\nplay');
		field.multiline = true;
		field.lineSpacing = 4;
		const before = paint(field);
		expect((before[0] - 14 + before[1] + 4) / 2).toBe(24);
		const baselines = field.getLinesArr().map(line => line.baseline);
		field.text = 'เริ่มเกม\n开始游戏';
		const after = paint(field);
		expect((Math.min(after[0] - 19, after[1] - 16)
			+ Math.max(after[0] + 3, after[1] + 2)) / 2).toBe(24);
		expect(field.getLinesArr().map(line => line.baseline)).toEqual(baselines);
		expect(before[1] - before[0]).toBe(24);
		expect(after[1] - after[0]).toBe(24);
		field.text = 'ABC\n\nplay';
		const lines = field.getLinesArr();
		expect(lines.map(line => line.baseline)).toEqual([16, 16, 16]);
	});

	it.each([false, true])('keeps input baselines, selection and caret stable with multiline=%s', multiline => {
		const field = createField('ABC');
		field.multiline = multiline;
		field.type = TextFieldType.INPUT;
		field.setIsTyping(true);
		field.setSelection(1, 1);
		const before = paint(field);
		expect(context.fillRect).toHaveBeenCalledWith(10, 14, 1, 20);
		field.text = 'play';
		expect(paint(field)).toEqual(before);
		field.setSelection(1, 3);
		paint(field);
		expect(context.fillRect).toHaveBeenCalledWith(10, 14, 20, 20);
		expect(getTextRenderPadding(field)).toBe(0);
	});

	it.each([false, true])('shares the visual offset with link hits with multiline=%s', multiline => {
		const field = createField('');
		field.multiline = multiline;
		field.textFlow = [{ text: 'ABC', style: { href: 'event:activate' } }];
		const stage = new Stage();
		stage.addChild(field);
		const listener = vi.fn();
		field.addEventListener(TextEvent.LINK, listener);
		// The centered glyph lies below the unaligned nominal line box.
		TouchEvent.dispatchTouchEvent(field, TouchEvent.TOUCH_TAP, false, false, 10, 29, 0);
		expect(listener).toHaveBeenCalledOnce();
	});

	it('retains glyph overhang in dynamic captures, without enlarging input viewports', () => {
		const field = createField('เริ่มเกม');
		expect(getTextRenderPadding(field)).toBe(2);
		field.multiline = true;
		expect(getTextRenderPadding(field)).toBe(2);
		field.type = TextFieldType.INPUT;
		expect(getTextRenderPadding(field)).toBe(0);
	});

	it('reuses cached ink metrics and refreshes them after explicit font invalidation', () => {
		const field = createField('ABC');
		const first = paint(field);
		const calls = context.measureText.mock.calls.length;
		field.y = 10;
		paint(field);
		expect(context.measureText).toHaveBeenCalledTimes(calls);
		inkScale = 1.2;
		expect(paint(field)).toEqual(first);
		field.invalidateTextMetrics();
		expect(paint(field)).not.toEqual(first);
	});

	it('keeps whitespace and zero-width fields finite without manufacturing ink', () => {
		const field = createField('   ');
		expect(paint(field)).toEqual([30]);
		field.width = 0;
		expect(paint(field)).toEqual([]);
		expect(field.getLinesArr()[0].baseline).toBe(0);
	});

	it('retains leading and trailing blank rows when centering a paragraph', () => {
		const field = createField('\nABC\n');
		field.multiline = true;
		field.height = 80;
		paint(field);
		expect(context.fillText.mock.calls.find(call => call[0] === 'ABC')?.[2]).toBe(46);
		expect(field.textHeight).toBe(60);
		expect(field.getLinesArr().map(line => line.height)).toEqual([20, 20, 20]);
	});

	it('centers mixed-size rich paragraphs without recentering individual rows', () => {
		const field = createField('');
		field.multiline = true;
		field.height = 80;
		field.lineSpacing = 6;
		field.textFlow = [{ text: 'ABC\n', style: { size: 32 } }, { text: 'play', style: { size: 14 } }];
		const baselines = paint(field);
		expect((baselines[0] - 32 * 0.7 + baselines[1] + 14 * 0.2) / 2).toBeCloseTo(40);
		const lines = field.getLinesArr();
		expect(baselines[1] - baselines[0]).toBeCloseTo(lines[0].height + 6 + lines[1].baseline - lines[0].baseline);
		expect(field.textHeight).toBe(52);
	});

	it.each(['top', 'bottom'] as const)('preserves nominal %s alignment in either line mode', alignment => {
		const field = createField('ABC');
		field.verticalAlign = alignment;
		const before = paint(field);
		field.multiline = true;
		expect(paint(field)).toEqual(before);
		expect(before).toEqual([alignment === 'top' ? 16 : 44]);
	});

	it('keeps alignment consistent in a viewport shorter than its glyphs', () => {
		const field = createField('ABC');
		field.height = 12;
		const before = paint(field);
		field.multiline = true;
		expect(paint(field)).toEqual(before);
		expect(before).toEqual([13]);
		expect(getTextRenderPadding(field)).toBe(0);
	});

	it('refreshes cached block bounds after paragraph spacing changes', () => {
		const field = createField('ABC\nplay');
		field.multiline = true;
		paint(field);
		field.lineSpacing = 8;
		const after = paint(field);
		expect(after[1] - after[0]).toBe(28);
		expect((after[0] - 14 + after[1] + 4) / 2).toBe(24);
	});

	it('keeps multiline input row selection and caret aligned after text changes', () => {
		const field = createField('ABC\nplay');
		field.type = TextFieldType.INPUT;
		field.multiline = true;
		field.height = 80;
		field.lineSpacing = 4;
		field.setIsTyping(true);
		field.setSelection(4, 4);
		const before = paint(field);
		expect(context.fillRect).toHaveBeenCalledWith(0, 42, 1, 20);
		field.text = 'play\nABC';
		field.setSelection(5, 8);
		expect(paint(field)).toEqual(before);
		expect(context.fillRect).toHaveBeenCalledWith(0, 42, 30, 20);
	});

	it('hits the second rich-text link at its centered paragraph position', () => {
		const field = createField('');
		field.multiline = true;
		field.height = 80;
		field.lineSpacing = 4;
		field.textFlow = [
			{ text: 'ABC\n', style: { href: 'event:first' } },
			{ text: 'play', style: { href: 'event:second' } },
		];
		const stage = new Stage();
		stage.addChild(field);
		const listener = vi.fn();
		field.addEventListener(TextEvent.LINK, listener);
		TouchEvent.dispatchTouchEvent(field, TouchEvent.TOUCH_TAP, false, false, 10, 53, 0);
		expect(listener).toHaveBeenCalledOnce();
		expect(listener.mock.calls[0][0].text).toBe('second');
	});
});
