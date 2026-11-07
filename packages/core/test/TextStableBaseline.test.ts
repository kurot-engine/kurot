import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextField, TextFieldType } from '../src/index.js';
import { CanvasRenderer } from '../src/kurot/player/canvas/CanvasRenderer.js';
import { textLanguages } from './fixtures/text/languages.js';
import { createTextMetrics } from './helpers/text-metrics.js';

const context = {
	font: '',
	textBaseline: 'alphabetic',
	textAlign: 'left',
	save: vi.fn(),
	restore: vi.fn(),
	translate: vi.fn(),
	beginPath: vi.fn(),
	rect: vi.fn(),
	clip: vi.fn(),
	fillText: vi.fn(),
	strokeText: vi.fn(),
	fillRect: vi.fn(),
	measureText: vi.fn((text: string): TextMetrics => {
		const size = Number(context.font.match(/([\d.]+)px/)?.[1] ?? 20);
		return {
			...createTextMetrics((Array.from(text).length * size) / 2),
			fontBoundingBoxAscent: size * 1.1,
			fontBoundingBoxDescent: size * 0.3,
			actualBoundingBoxAscent: text ? size * (text.length % 2 ? 1.05 : 0.65) : 0,
			actualBoundingBoxDescent: text ? size * (text.length % 3 ? 0.25 : 0) : 0,
		};
	}),
};

function paint(field: TextField): number[] {
	context.fillText.mockClear();
	new CanvasRenderer().renderTextFieldToContext(field, context as unknown as CanvasRenderingContext2D, 0, 0);
	return context.fillText.mock.calls.map(call => call[2] as number);
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
});
afterEach(() => vi.restoreAllMocks());

describe('font-frame layout independent of current glyph ink', () => {
	for (const language of textLanguages) {
		it.each(['top', 'middle', 'bottom'] as const)(
			`${language.code} keeps its %s baseline across text changes`,
			alignment => {
				const field = new TextField();
				field.size = 20;
				field.width = 600;
				field.height = 84;
				field.verticalAlign = alignment;
				for (const multiline of [false, true]) {
					field.multiline = multiline;
					for (const text of language.variants) {
						field.text = text;
						expect(paint(field)).toEqual([alignment === 'top' ? 22 : alignment === 'middle' ? 50 : 78]);
						expect(field.textHeight).toBe(28);
						expect(field.measureText().height).toBe(28);
					}
				}
			},
		);
	}

	it('uses the same font frame for blank rows and preserves rich-run baselines', () => {
		const field = new TextField();
		field.size = 20;
		field.verticalAlign = 'top';
		field.lineSpacing = 4;
		field.textFlow = [
			{ text: 'ABC', style: { size: 30 } },
			{ text: 'g\n\nÁ', style: { size: 20 } },
		];
		const baselines = paint(field);
		expect(baselines[0]).toBe(baselines[1]);
		expect(field.getLinesArr().map(line => line.height)).toEqual([42, 28, 28]);
		expect(field.measureText().height).toBe(106);
	});

	it('keeps the first baseline fixed while typing, clearing and wrapping again', () => {
		const field = new TextField();
		field.size = 20;
		field.width = 70;
		field.verticalAlign = 'top';
		for (const language of textLanguages) {
			for (let pass = 0; pass < 2; pass++) {
				field.text = '';
				for (const character of Array.from(language.text)) {
					field.text += character;
					expect(paint(field)[0]).toBe(22);
				}
			}
		}
	});

	it('keeps input editing rows nominal and independent of dynamic font-frame height', () => {
		const field = new TextField();
		field.size = 20;
		field.type = TextFieldType.INPUT;
		field.text = 'PROMOCIÓN';
		expect(field.textHeight).toBe(20);
		field.type = TextFieldType.DYNAMIC;
		expect(field.textHeight).toBe(28);
	});

	it('allows scrolling to the last complete font-frame row', () => {
		const field = new TextField();
		field.size = 20;
		field.height = 40;
		field.verticalAlign = 'top';
		field.text = 'ABC\nPROMOCIÓN\nเริ่มเกม';
		expect(field.maxScrollV).toBe(3);
		field.scrollV = 3;
		expect(field.getScrollYOffset()).toBe(56);
		expect(paint(field)).toEqual([22]);
	});
});
