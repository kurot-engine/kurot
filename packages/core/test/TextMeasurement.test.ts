import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextField, TextFieldType } from '../src/index.js';
import { createTextMetrics } from './helpers/text-metrics.js';

describe('TextField independent measurement', () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			font: '',
			measureText: (text: string) => createTextMetrics(text.length * 10),
		} as unknown as CanvasRenderingContext2D);
	});

	afterEach(() => vi.restoreAllMocks());

	it('measures another width without replacing render lines or constraints', () => {
		const field = new TextField();
		field.size = 20;
		field.width = 100;
		field.height = 10;
		field.lineSpacing = 3;
		field.text = 'abcdef';
		const lines = field.getLinesArr();

		expect(field.measureText(20)).toEqual({ width: 20, height: 66 });
		expect(field.measureText()).toEqual({ width: 60, height: 20 });
		expect([field.$explicitWidth, field.$explicitHeight]).toEqual([100, 10]);
		expect(field.getLinesArr()).toBe(lines);
		expect(field.numLines).toBe(1);
	});

	it('measures small and mixed rich-text sizes instead of imposing the base size', () => {
		const field = new TextField();
		field.textFlow = [
			{ text: 'ab', style: { size: 14, bold: true } },
			{ text: 'cd', style: { size: 24, italic: true } },
		];

		expect(field.measureText()).toEqual({ width: 40, height: 24 });
		expect(field.measureText(20)).toEqual({ width: 20, height: 38 });
		expect(field.textHeight).toBe(24);
	});

	it('retains the run size for empty and trailing hard-separated lines', () => {
		const field = new TextField();
		field.textFlow = [{ text: 'a\n\n', style: { size: 14 } }];

		expect(field.measureText()).toEqual({ width: 10, height: 42 });
		expect(field.textHeight).toBe(42);
	});

	it('keeps single-line and input measurement consistent with rendered content', () => {
		const field = new TextField();
		field.size = 20;
		field.multiline = false;
		field.textFlow = [{ text: 'abc\ndef', style: { size: 14 } }];

		expect(field.measureText(10)).toEqual({ width: 30, height: 14 });
		field.type = TextFieldType.INPUT;
		expect(field.measureText(10)).toEqual({ width: 30, height: 20 });
	});

	it('uses the base size for an unstyled blank run between styled runs', () => {
		const field = new TextField();
		field.size = 20;
		field.textFlow = [{ text: 'a\n', style: { size: 14 } }, { text: '\n' }, { text: 'b', style: { size: 24 } }];

		expect(field.measureText()).toEqual({ width: 10, height: 58 });
		expect(field.textHeight).toBe(58);
	});

	it('clears rich styles when assigning the same plain text', () => {
		const field = new TextField();
		field.textFlow = [{ text: 'same', style: { size: 14, bold: true } }];
		field.text = 'same';

		expect(field.textFlow).toBeUndefined();
		expect(field.text).toBe('same');
		expect(field.textHeight).toBe(field.size);
		expect(field.$setTextFromInput('same')).toBe(false);
	});

	it.each([-1, Infinity, -Infinity])('rejects invalid measurement width %s without mutation', width => {
		const field = new TextField();
		field.width = 80;
		expect(() => field.measureText(width)).toThrow(RangeError);
		expect(field.width).toBe(80);
	});

	it('does not return negative line spacing for a zero-width field', () => {
		const field = new TextField();
		field.lineSpacing = 4;
		field.textFlow = [];
		expect(field.measureText(0)).toEqual({ width: 0, height: 0 });
	});
});
