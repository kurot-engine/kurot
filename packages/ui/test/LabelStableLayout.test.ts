import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasRenderer, TextField } from '@kurot/core';
import { Label, RichLabel } from '../src/index.js';
import { textLanguages } from '../../core/test/fixtures/text/languages.js';
import { createTextMetrics } from './helpers/text-metrics.js';

class InspectableLabel extends Label {
	public get field(): TextField {
		return this._textField;
	}
}

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

function validate(label: Label | RichLabel): void {
	label.validateProperties();
	label.validateSize();
	label.validateDisplayList();
}

function baselines(label: InspectableLabel): number[] {
	context.fillText.mockClear();
	new CanvasRenderer().renderTextFieldToContext(label.field, context as unknown as CanvasRenderingContext2D, 0, 0);
	return context.fillText.mock.calls.map(call => label.field.y + Number(call[2]));
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
});
afterEach(() => vi.restoreAllMocks());

describe('Label font-frame sizing and fitting', () => {
	for (const language of textLanguages) {
		it(`${language.code} retains automatic height and baseline across accents and descenders`, () => {
			const label = new InspectableLabel();
			label.size = 20;
			label.stroke = 2;
			label.multiline = false;
			for (const text of language.variants) {
				label.text = text;
				validate(label);
				expect(label.height).toBe(36);
				expect(label.field.y).toBe(4);
				expect(baselines(label)).toEqual([26]);
				label.textFit = 'shrink';
				validate(label);
				expect([label.height, label.renderedSize, label.textFitOverflow]).toEqual([36, 20, false]);
			}
		});

		it(`${language.code} fits fixed height using font frames and restores the authored size`, () => {
			const label = new InspectableLabel();
			label.size = 20;
			label.stroke = 2;
			label.width = 600;
			label.height = 34;
			label.multiline = false;
			label.textFit = 'shrink';
			label.minFontSize = 8;
			for (const text of language.variants) {
				label.text = text;
				validate(label);
				expect(label.size).toBe(20);
				expect(label.renderedSize).toBeGreaterThanOrEqual(18.5);
				expect(label.renderedSize).toBeLessThanOrEqual(26 / 1.4);
				expect(label.field.textHeight + 8).toBeLessThanOrEqual(34);
				expect(label.textFitOverflow).toBe(false);
			}
			label.height = 60;
			validate(label);
			expect(label.renderedSize).toBe(20);
		});

		it(`${language.code} keeps wrapped rows and retyped first baselines stable`, () => {
			const label = new InspectableLabel();
			label.size = 20;
			label.stroke = 2;
			label.width = 140;
			label.lineSpacing = 3;
			label.verticalAlign = 'top';
			label.wordWrap = true;
			label.text = `${language.text} ${language.text}`;
			validate(label);
			const rows = label.field.numLines;
			expect(rows).toBeGreaterThan(1);
			expect(label.height).toBe(rows * 28 + (rows - 1) * 3 + 8);
			for (let pass = 0; pass < 2; pass++) {
				label.text = '';
				validate(label);
				for (const character of Array.from(language.text)) {
					label.text += character;
					validate(label);
					expect(baselines(label)[0]).toBe(26);
				}
			}
		});
	}

	it.each(['top', 'middle', 'bottom'] as const)('uses a fixed %s line frame in a constrained box', alignment => {
		const label = new InspectableLabel('PROMOCIÓN');
		label.size = 20;
		label.stroke = 2;
		label.width = 200;
		label.height = 60;
		label.verticalAlign = alignment;
		validate(label);
		expect(baselines(label)).toEqual([alignment === 'top' ? 26 : alignment === 'middle' ? 38 : 50]);
	});

	it('keeps RichLabel automatic height independent of the current glyph ink', () => {
		const label = new RichLabel();
		label.size = 20;
		for (const language of textLanguages) {
			for (const text of language.variants) {
				label.textFlow = [{ text }];
				validate(label);
				expect(label.height).toBe(28);
			}
		}
	});
});
