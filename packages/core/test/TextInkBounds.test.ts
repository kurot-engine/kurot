import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextField } from '../src/kurot/text/TextField.js';
import { getTextRenderPadding } from '../src/kurot/text/TextRenderBounds.js';
import { createTextMetrics } from './helpers/text-metrics.js';

const context = { measureText: vi.fn() };

beforeEach(() => {
	context.measureText.mockImplementation((text: string) => createTextMetrics(text.length * 10));
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
});

afterEach(() => vi.restoreAllMocks());

describe('text ink beyond its horizontal advance', () => {
	it('retains left bearings and right overhang without changing layout or baselines', () => {
		context.measureText.mockImplementation((text: string): TextMetrics => ({
			...createTextMetrics(text.length * 10),
			actualBoundingBoxLeft: 7,
			actualBoundingBoxRight: text.length * 10 + 9,
		}));
		const field = new TextField();
		field.text = 'j';
		field.size = 24;
		const before = field.measureText();
		expect(getTextRenderPadding(field)).toBeGreaterThanOrEqual(10);
		expect(field.measureText()).toEqual(before);
	});

	it('protects synthetic italic when native metrics report only the advance', () => {
		const field = new TextField();
		field.size = 96;
		field.textFlow = [{ text: 'f', style: { italic: true } }];
		expect(getTextRenderPadding(field)).toBeGreaterThanOrEqual(96);
		field.textFlow = [{ text: 'f', style: { italic: false } }];
		expect(getTextRenderPadding(field)).toBe(0);
	});

	it('retains antialiasing at a fractional advance without changing that advance', () => {
		context.measureText.mockImplementation(() => ({
			...createTextMetrics(3.575),
			actualBoundingBoxAscent: 9,
			actualBoundingBoxDescent: 0,
			actualBoundingBoxRight: 3.36,
			fontBoundingBoxAscent: 12,
			fontBoundingBoxDescent: 2,
		}));
		const field = new TextField();
		field.text = 'f';
		field.size = 12;
		expect(getTextRenderPadding(field)).toBeGreaterThanOrEqual(2);
		expect(field.textWidth).toBe(3.575);
	});
});
