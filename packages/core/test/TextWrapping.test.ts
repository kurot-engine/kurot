import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextField, TextFieldType } from '../src/index.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';
import { createTextMetrics } from './helpers/text-metrics.js';

function paintedLines(field: TextField): string[] {
	return field.getLinesArr().map(line => line.elements.map(element => element.text).join(''));
}

function wrapped(text: string, width: number): TextField {
	const field = new TextField();
	field.size = 20;
	field.width = width;
	field.wordWrap = true;
	field.text = text;
	return field;
}

const measure = vi.fn((text: string) => createTextMetrics(Array.from(text.replace(/[\u200b\u2060]/g, '')).length * 10));

describe('Unicode width-constrained text layout', () => {
	beforeEach(() => {
		measure.mockClear();
		measure.mockImplementation(text => createTextMetrics(Array.from(text.replace(/[\u200b\u2060]/g, '')).length * 10));
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			font: '',
			measureText: measure,
		} as unknown as CanvasRenderingContext2D);
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it('does not carry soft-wrap separators to the next line or include them in measured width', () => {
		const field = wrapped('hello   world', 50);
		expect(paintedLines(field)).toEqual(['hello', 'world']);
		expect(field.textWidth).toBe(50);
		expect(field.getLinesArr().map(line => line.charNum)).toEqual([8, 5]);
		expect(field.text).toBe('hello   world');
	});

	it('wraps the StatusBadge text without indenting continuation lines', () => {
		const text = 'AUTO-SIZED COMPONENT WIDTH FROM THE LONGEST LINE HEIGHT FROM THREE TEXT LINES';
		const field = wrapped(text, 300);
		expect(paintedLines(field)).toEqual([
			'AUTO-SIZED COMPONENT WIDTH',
			'FROM THE LONGEST LINE HEIGHT',
			'FROM THREE TEXT LINES',
		]);
		expect(field.getLinesArr().reduce((sum, line) => sum + line.charNum, 0)).toBe(text.length);
	});

	it.each([
		['en_US', 'AUTOMATIC CASH OUT'],
		['uk_UA', 'АВТОМАТИЧНЕ ВИВЕДЕННЯ КОШТІВ'],
		['kk_KZ', 'АВТОМАТТЫ АҚША ШЫҒАРУ'],
		['ru_RU', 'АВТОМАТИЧЕСКИЙ ВЫВОД СРЕДСТВ'],
		['pt_PT', 'LEVANTAMENTO AUTOMÁTICO'],
		['es_ES', 'RETIRADA AUTOMÁTICA'],
		['de_DE', 'AUTOMATISCHE AUSZAHLUNG'],
		['fr_FR', 'RETRAIT AUTOMATIQUE'],
		['it_IT', 'INCASSO AUTOMATICO'],
	])('wraps %s text without altering its content', (_locale, text) => {
		const field = wrapped(text, 170);
		const lines = paintedLines(field);
		expect(lines.length).toBeGreaterThan(1);
		expect(lines.every(line => !line.startsWith(' ') && !line.endsWith(' '))).toBe(true);
		expect(lines.join('').replace(/ /g, '')).toBe(text.replace(/ /g, ''));
		expect(field.text).toBe(text);
		expect(field.textWidth).toBeLessThanOrEqual(170);
	});

	it('protects closing Chinese punctuation and does not end a line with an opening bracket', () => {
		expect(paintedLines(wrapped('你好，世界。', 20))).toEqual(['你', '好，', '世', '界。']);
		expect(paintedLines(wrapped('甲（乙）丙', 30))).toEqual(['甲', '（乙）', '丙']);
		expect(paintedLines(wrapped('你好，', 10))).toEqual(['你', '好，']);
	});

	it('allows Japanese and Korean line opportunities without Latin word segmentation', () => {
		expect(paintedLines(wrapped('日本語の文章', 30))).toEqual(['日本語', 'の文章']);
		expect(paintedLines(wrapped('한국어 문장', 20))).toEqual(['한국', '어', '문장']);
	});

	it('keeps non-breaking space and word-joiner sequences together even when they overflow', () => {
		expect(paintedLines(wrapped('a\u00a0b c', 10))).toEqual(['a\u00a0b', 'c']);
		expect(paintedLines(wrapped('a\u202fb c', 10))).toEqual(['a\u202fb', 'c']);
		expect(paintedLines(wrapped('a\u2060b c', 10))).toEqual(['a\u2060b', 'c']);
	});

	it('falls back within an oversized alphabetic word', () => {
		expect(paintedLines(wrapped('ABCDEFGHIJ', 30))).toEqual(['ABC', 'DEF', 'GHI', 'J']);
		expect(paintedLines(wrapped('АБВГДЕЖЗ', 30))).toEqual(['АБВ', 'ГДЕ', 'ЖЗ']);
	});

	it('preserves explicit indentation and accounts for CRLF and mandatory Unicode separators', () => {
		const field = wrapped('one\r\n  two\u2028', 100);
		expect(paintedLines(field)).toEqual(['one', '  two', '']);
		expect(field.getLinesArr().map(line => line.charNum)).toEqual([5, 6, 0]);
		expect(field.getLinesArr().map(line => line.hasNextLine)).toEqual([true, true, false]);
	});

	it('does not treat style changes inside words as line opportunities', () => {
		const field = wrapped('', 90);
		field.textFlow = [{ text: 'abc ' }, { text: 'de', style: { textColor: 0xff0000 } }, { text: 'fghi' }];
		expect(paintedLines(field)).toEqual(['abc', 'defghi']);
		expect(field.getLinesArr()[1].elements[0].style?.textColor).toBe(0xff0000);
	});

	it('measures complete runs rather than adding independently measured words', () => {
		measure.mockImplementation(text => createTextMetrics(text.length * 10 - (text.includes('a b') ? 5 : 0)));
		expect(paintedLines(wrapped('a b c', 25))).toEqual(['a b', 'c']);
	});

	it('preserves source indices when tapping a continuation line after hidden spaces', () => {
		const field = wrapped('hello   world', 50);
		field.type = TextFieldType.INPUT;
		field.multiline = true;
		expect(field.$getInputIndexAt(0, 25)).toBe(8);
		expect(field.$getInputIndexAt(15, 25)).toBe(10);
	});

	it.each(['hello   world', 'hello\r\nworld'])('paints the continuation caret using source offsets in %j', text => {
		const context = {
			save: vi.fn(),
			restore: vi.fn(),
			translate: vi.fn(),
			beginPath: vi.fn(),
			rect: vi.fn(),
			clip: vi.fn(),
			fillRect: vi.fn(),
			fillText: vi.fn(),
			strokeText: vi.fn(),
			measureText: measure,
			font: '',
			textBaseline: 'alphabetic',
			textAlign: 'start',
			fillStyle: '',
		} as unknown as CanvasRenderingContext2D;
		const field = wrapped(text, 50);
		field.type = TextFieldType.INPUT;
		field.multiline = true;
		field.height = 60;
		field.setIsTyping(true);
		const start = text.indexOf('world');
		field.setSelection(start + 2, start + 2);
		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		expect(context.fillRect).toHaveBeenCalledWith(20, 20, 1, 20);
	});

	it('avoids repeatedly measuring the complete remaining suffix of a long word', () => {
		const field = wrapped('A'.repeat(6000), 30);
		expect(field.numLines).toBe(2000);
		expect(measure.mock.calls.length).toBeLessThan(18000);
	});

	it('preserves empty and zero-width layout and single-line input behavior', () => {
		const field = wrapped('', 100);
		expect(field.numLines).toBe(1);
		expect(field.textHeight).toBe(20);
		field.width = 0;
		expect(field.textHeight).toBe(0);
		field.width = 20;
		field.type = TextFieldType.INPUT;
		field.text = 'abc def';
		expect(paintedLines(field)).toEqual(['abc def']);
	});
});
