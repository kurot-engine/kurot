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
	field.text = text;
	return field;
}

function paint(field: TextField): number[] {
	context.fillText.mockClear();
	context.fillRect.mockClear();
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

describe('stable alphabetic baselines and line-frame alignment', () => {
	it('defaults to middle in either line mode and input type', () => {
		const field = createField('ABC');
		expect(field.verticalAlign).toBe('middle');
		for (const type of [TextFieldType.DYNAMIC, TextFieldType.INPUT]) {
			field.type = type;
			for (const multiline of [false, true]) {
				field.multiline = multiline;
				expect(paint(field)).toEqual([30]);
			}
		}
		field.type = TextFieldType.DYNAMIC;
		field.verticalAlign = 'top';
		expect(paint(field)).toEqual([16]);
	});

	it.each(Object.keys(ink))('retains the same frame and baseline for %j', text => {
		const field = createField(text);
		expect(paint(field)).toEqual([30]);
		expect(context.textBaseline).toBe('alphabetic');
		expect(field.textHeight).toBe(20);
		field.multiline = true;
		expect(paint(field)).toEqual([30]);
	});

	it('aligns mixed font sizes on one shared baseline', () => {
		const field = createField('');
		field.textFlow = [{ text: 'ABC', style: { size: 32 } }, { text: 'play', style: { size: 14 } }];
		const baselines = paint(field);
		expect(baselines[0]).toBe(baselines[1]);
		expect(baselines[0]).toBeCloseTo(33.6);
		expect(field.textHeight).toBe(32);
	});

	it('preserves paragraph baselines across glyph and line-spacing changes', () => {
		const field = createField('ABC\nplay');
		field.multiline = true;
		field.lineSpacing = 4;
		const before = paint(field);
		expect(before).toEqual([18, 42]);
		field.text = 'เริ่มเกม\n开始游戏';
		expect(paint(field)).toEqual(before);
		field.lineSpacing = 8;
		expect(paint(field)).toEqual([16, 44]);
		field.text = 'ABC\n\nplay';
		expect(field.getLinesArr().map(line => line.baseline)).toEqual([16, 16, 16]);
	});

	it('refreshes ink metrics without recentering text after font invalidation', () => {
		const field = createField('ABC');
		const first = paint(field);
		const calls = context.measureText.mock.calls.length;
		field.y = 10;
		paint(field);
		expect(context.measureText).toHaveBeenCalledTimes(calls);
		inkScale = 1.2;
		expect(paint(field)).toEqual(first);
		field.invalidateTextMetrics();
		expect(paint(field)).toEqual(first);
		expect(field.getLinesArr()[0].inkAscent).toBeCloseTo(16.8);
	});

	it('keeps whitespace and zero-width fields finite', () => {
		const field = createField('   ');
		expect(paint(field)).toEqual([30]);
		field.width = 0;
		expect(paint(field)).toEqual([]);
		expect(field.getLinesArr()[0].baseline).toBe(0);
	});

	it.each(['top', 'middle', 'bottom'] as const)('aligns stable rows at %s without changing measurements', alignment => {
		const field = createField('ABC');
		field.verticalAlign = alignment;
		const baseline = alignment === 'top' ? 16 : alignment === 'middle' ? 30 : 44;
		const measured = field.measureText();
		for (const text of Object.keys(ink)) {
			field.text = text;
			for (const multiline of [false, true]) {
				field.multiline = multiline;
				expect(paint(field)).toEqual([baseline]);
			}
		}
		field.text = 'ABC';
		expect(field.measureText()).toEqual(measured);
	});

	it.each(['top', 'middle', 'bottom'] as const)('aligns a paragraph and retains blank rows at %s', alignment => {
		const field = createField('ABC\nplay');
		field.multiline = true;
		field.height = 80;
		field.lineSpacing = 4;
		field.verticalAlign = alignment;
		const offset = alignment === 'top' ? 0 : alignment === 'middle' ? 18 : 36;
		expect(paint(field)).toEqual([16 + offset, 40 + offset]);
		expect(field.measureText()).toEqual({ width: 40, height: 44 });
		field.text = '\nABC\n';
		const blankOffset = alignment === 'top' ? 0 : alignment === 'middle' ? 6 : 12;
		paint(field);
		expect(context.fillText.mock.calls.find(call => call[0] === 'ABC')?.[2]).toBe(blankOffset + 40);
		expect(field.textHeight).toBe(68);
		field.text = ' \n \n ';
		expect(paint(field)).toEqual([40, 64].map(baseline => baseline + blankOffset));
	});

	it('retains mixed-size paragraph baselines without recentering individual rows', () => {
		const field = createField('');
		field.multiline = true;
		field.height = 80;
		field.lineSpacing = 6;
		field.textFlow = [{ text: 'ABC\n', style: { size: 32 } }, { text: 'play', style: { size: 14 } }];
		const baselines = paint(field);
		expect(baselines[0]).toBeCloseTo(39.6);
		expect(baselines[1]).toBeCloseTo(63.2);
		expect(field.textHeight).toBe(52);
	});

	it.each(['top', 'middle', 'bottom'] as const)('preserves input caret, selection and composition at %s', alignment => {
		for (const multiline of [false, true]) {
			const field = createField('ABC');
			field.type = TextFieldType.INPUT;
			field.multiline = multiline;
			field.verticalAlign = alignment;
			field.setIsTyping(true);
			field.setSelection(1, 1);
			const rowTop = alignment === 'top' ? 0 : alignment === 'middle' ? 14 : 28;
			expect(paint(field)).toEqual([rowTop + 16]);
			expect(context.fillRect).toHaveBeenCalledWith(10, rowTop, 1, 20);
			expect(field.$getInputIndexAt(10, rowTop + 10)).toBe(1);
			field.text = 'play';
			field.setSelection(1, 3);
			field.$setCompositionRange(1, 3);
			expect(paint(field)).toEqual([rowTop + 16]);
			expect(context.fillRect).toHaveBeenCalledWith(10, rowTop, 20, 20);
			expect(context.fillRect).toHaveBeenCalledWith(10, rowTop + 19, 20, 1);
			field.$setCompositionRange();
			field.setIsTyping(false);
		}
	});

	it.each(['top', 'middle', 'bottom'] as const)('shares %s paragraph positioning with rich-text link hits', alignment => {
		const field = createField('');
		field.multiline = true;
		field.height = 80;
		field.lineSpacing = 4;
		field.verticalAlign = alignment;
		field.textFlow = [{ text: 'ABC\n' }, { text: 'play', style: { href: 'event:second' } }];
		const stage = new Stage();
		stage.addChild(field);
		const listener = vi.fn();
		field.addEventListener(TextEvent.LINK, listener);
		const rowTop = alignment === 'top' ? 24 : alignment === 'middle' ? 42 : 60;
		TouchEvent.dispatchTouchEvent(field, TouchEvent.TOUCH_TAP, false, false, 10, rowTop + 10, 0);
		expect(listener).toHaveBeenCalledOnce();
		expect(listener.mock.calls[0][0].text).toBe('second');
	});

	it.each(['top', 'middle', 'bottom'] as const)('keeps %s ink padding independent of clipped viewport height', alignment => {
		const field = createField('เริ่มเกม');
		field.verticalAlign = alignment;
		expect(getTextRenderPadding(field)).toBe(4);
		field.height = 2;
		expect(getTextRenderPadding(field)).toBe(4);
		field.type = TextFieldType.INPUT;
		expect(getTextRenderPadding(field)).toBe(0);
	});

	it('keeps antialiasing padding out of measurement', () => {
		const field = createField('ABC');
		const measured = field.measureText();
		field.verticalAlign = 'top';
		expect(getTextRenderPadding(field)).toBe(2);
		field.text = 'เริ่มเกม';
		expect(getTextRenderPadding(field)).toBe(4);
		field.text = 'ABC';
		expect(field.measureText()).toEqual(measured);
	});

	it('skips fully hidden glyph rows before painting outlines when scrolled', () => {
		const field = createField('ABC\nABC\nABC');
		field.multiline = true;
		field.height = 20;
		field.verticalAlign = 'top';
		field.stroke = 4;
		field.scrollV = 2;
		expect(paint(field)).toEqual([16]);
		expect(context.strokeText).toHaveBeenCalledExactlyOnceWith('ABC', 0, 16);
	});

	it('retains the alignment policy in a viewport shorter than one row', () => {
		const field = createField('ABC');
		field.height = 12;
		expect(paint(field)).toEqual([12]);
		field.multiline = true;
		expect(paint(field)).toEqual([12]);
	});

	it.each(['top', 'middle', 'bottom'] as const)('keeps multiline input rows stable at %s after text changes', alignment => {
		const field = createField('ABC\nplay');
		field.type = TextFieldType.INPUT;
		field.multiline = true;
		field.height = 80;
		field.lineSpacing = 4;
		field.verticalAlign = alignment;
		field.setIsTyping(true);
		field.setSelection(4, 4);
		const rowTop = alignment === 'top' ? 24 : alignment === 'middle' ? 42 : 60;
		const before = paint(field);
		expect(context.fillRect).toHaveBeenCalledWith(0, rowTop, 1, 20);
		field.text = 'play\nABC';
		field.setSelection(5, 8);
		expect(paint(field)).toEqual(before);
		expect(context.fillRect).toHaveBeenCalledWith(0, rowTop, 30, 20);
		expect(field.$getInputIndexAt(10, rowTop + 10)).toBe(6);
	});
});
