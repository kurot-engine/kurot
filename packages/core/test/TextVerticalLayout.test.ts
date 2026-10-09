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
	});

	it('aligns mixed font sizes on one baseline using the union of run ink', () => {
		const field = createField('');
		field.textFlow = [{ text: 'ABC', style: { size: 32 } }, { text: 'play', style: { size: 14 } }];
		const baselines = paint(field);
		expect(baselines[0]).toBe(baselines[1]);
		expect((baselines[0] - 32 * 0.7 + baselines[1] + 14 * 0.2) / 2).toBeCloseTo(24);
		expect(field.textHeight).toBe(32);
	});

	it('keeps multiline baselines and line spacing independent of the visible glyphs', () => {
		const field = createField('ABC\nplay');
		field.multiline = true;
		field.lineSpacing = 4;
		const before = paint(field);
		field.text = 'เริ่มเกม\n开始游戏';
		expect(paint(field)).toEqual(before);
		expect(before[1] - before[0]).toBe(24);
		field.text = 'ABC\n\nplay';
		const lines = field.getLinesArr();
		expect(lines.map(line => line.baseline)).toEqual([16, 16, 16]);
	});

	it('keeps input baselines, selection and caret in the nominal line box', () => {
		const field = createField('ABC');
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

	it('shares the visual offset with link hit testing', () => {
		const field = createField('');
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
		expect(getTextRenderPadding(field)).toBe(4);
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
});
