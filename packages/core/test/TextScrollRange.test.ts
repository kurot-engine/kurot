import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextField, TextFieldType } from '../src/index.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';
import { createTextMetrics } from './helpers/text-metrics.js';

const context = {
	font: '',
	save: vi.fn(),
	restore: vi.fn(),
	translate: vi.fn(),
	beginPath: vi.fn(),
	rect: vi.fn(),
	clip: vi.fn(),
	fillText: vi.fn(),
	strokeText: vi.fn(),
	measureText(text: string): TextMetrics {
		const size = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 16);
		return {
			...createTextMetrics(text.length * size / 2),
			fontBoundingBoxAscent: size,
			fontBoundingBoxDescent: size / 4,
			actualBoundingBoxAscent: text ? size : 0,
			actualBoundingBoxDescent: text ? size / 4 : 0,
		};
	},
};

function mixedRows(size = 32, tailSize = 16): TextField {
	const field = new TextField();
	field.size = size;
	field.width = 1000;
	field.verticalAlign = 'top';
	field.textFlow = [{ text: 'Title\n' }, { text: 'body', style: { size: tailSize } }];
	return field;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
});
afterEach(() => vi.restoreAllMocks());

describe('dynamic text row-scroll range', () => {
	it('scrolls a smaller body row into view after a title that fits the viewport', () => {
		const field = mixedRows();
		field.height = 45;
		expect(field.getLinesArr().map(line => line.height)).toEqual([40, 20]);
		expect(field.getLinesArr()[0].height).toBeLessThan(field.height);
		expect(field.maxScrollV).toBe(2);
		field.scrollV = 99;
		expect(field.scrollV).toBe(2);
		expect(field.getScrollYOffset()).toBe(40);
		new CanvasRenderer().renderTextFieldToContext(field, context as unknown as CanvasRenderingContext2D, 0, 0);
		expect(context.fillText).toHaveBeenCalledExactlyOnceWith('body', 0, 16);
	});

	it.each([
		{ size: 100, tail: 20, height: 90, spacing: 0, offset: 125 },
		{ size: 32, tail: 16, height: 50, spacing: 8, offset: 48 },
		{ size: 32, tail: 16, height: 45, spacing: 35, offset: 75 },
	])('retains a terminal row after tall rows or gaps: %j', ({ size, tail, height, spacing, offset }) => {
		const field = mixedRows(size, tail);
		field.height = height;
		field.lineSpacing = spacing;
		expect(field.maxScrollV).toBe(2);
		field.scrollV = 2;
		expect(field.scrollV).toBe(2);
		expect(field.getScrollYOffset()).toBe(offset);
	});

	it.each([[50, 2], [50.1, 1], [60, 1]])(
		'uses the terminal row half-height boundary at viewport %s', (height, maxScroll) => {
			const field = mixedRows();
			field.height = height;
			expect(field.maxScrollV).toBe(maxScroll);
		},
	);

	it.each([
		[20, 0, 3], [30, 0, 3], [30.1, 0, 2], [40, 0, 2], [50.1, 0, 1],
		[34, 4, 3], [34.1, 4, 2], [44, 4, 2], [58.1, 4, 1],
		[26, -4, 3], [26.1, -4, 2],
	])('preserves uniform rows at viewport %s with spacing %s', (height, spacing, maxScroll) => {
		const field = new TextField();
		field.size = 16;
		field.height = height;
		field.lineSpacing = spacing;
		field.text = 'a\nb\nc';
		expect(field.maxScrollV).toBe(maxScroll);
	});

	it('updates the range after resizing and replacing rich rows', () => {
		const field = mixedRows();
		field.height = 45;
		field.scrollV = 2;
		field.height = 80;
		expect(field.maxScrollV).toBe(1);
		expect(field.scrollV).toBe(1);
		field.height = 45;
		field.textFlow = [{ text: 'Title\n' }, { text: 'body', style: { size: 32 } }];
		expect(field.maxScrollV).toBe(2);
		field.text = '';
		expect(field.maxScrollV).toBe(1);
	});

	it('keeps an overlapping tail reachable when negative spacing places it above the viewport', () => {
		const field = new TextField();
		field.size = 16;
		field.height = 15;
		field.lineSpacing = -25;
		field.text = 'a\nb\nc';
		expect(field.maxScrollV).toBe(2);
		field.scrollV = 99;
		expect(field.scrollV).toBe(2);
		expect(field.getScrollYOffset()).toBe(-5);
	});

	it('keeps automatic and single-line ranges at one', () => {
		const field = mixedRows();
		expect(field.maxScrollV).toBe(1);
		field.height = 45;
		field.multiline = false;
		expect(field.maxScrollV).toBe(1);
	});

	it.each([[24, 3], [24.1, 2], [40, 2]])('retains nominal input rows at viewport %s', (height, maxScroll) => {
		const field = new TextField();
		field.type = TextFieldType.INPUT;
		field.multiline = true;
		field.size = 16;
		field.height = height;
		field.text = 'a\nb\nc';
		expect(field.getLinesArr().map(line => line.height)).toEqual([16, 16, 16]);
		expect(field.maxScrollV).toBe(maxScroll);
	});
});
