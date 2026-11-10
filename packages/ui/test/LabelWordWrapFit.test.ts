import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { splitGraphemes, TextField } from '@kurot/core';
import { Label } from '../src/index.js';
import { createTextMetrics } from './helpers/text-metrics.js';

const canvas = { font: '', measureText: vi.fn() };

class InspectableLabel extends Label {
	public get field(): TextField {
		return this._textField;
	}
}

function field(label: InspectableLabel): TextField {
	return label.field;
}

function lines(label: InspectableLabel): string[] {
	return field(label).getLinesArr().map(line => line.elements.map(element => element.text).join(''));
}

function validate(label: Label): void {
	label.validateProperties();
	label.validateSize();
	label.validateDisplayList();
}

function fitted(text: string, width = 88, height = 60): InspectableLabel {
	const label = new InspectableLabel(text);
	label.size = 20;
	label.minFontSize = 12;
	label.width = width + 8;
	label.height = height + 6;
	label.stroke = 1;
	label.wordWrap = true;
	label.textFit = 'shrink';
	validate(label);
	return label;
}

describe('Label word wrapping before font fitting fallback', () => {
	beforeEach(() => {
		canvas.measureText.mockReset().mockImplementation((text: string) => {
			const size = Number(/([\d.]+)px/.exec(canvas.font)?.[1] ?? 20);
			return createTextMetrics(splitGraphemes(text).length * size / 2);
		});
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			canvas as unknown as CanvasRenderingContext2D,
		);
	});
	afterEach(() => vi.restoreAllMocks());

	it.each(["l'événement d'octobre", 'Доказуемая честность', 'abcdefghijk october'])(
		'preserves normal word boundaries at the largest fitting size for %s', text => {
			const label = fitted(text);
			expect(lines(label)).toEqual(text.split(' '));
			const longest = Math.max(...text.split(' ').map(word => splitGraphemes(word).length));
			expect(label.renderedSize).toBeGreaterThanOrEqual(88 * 2 / longest - 0.2);
			expect(label.renderedSize).toBeLessThanOrEqual(88 * 2 / longest);
			expect(label.size).toBe(20);
			expect(label.textFitOverflow).toBe(false);
			expect([field(label).x, field(label).y, field(label).width, field(label).height]).toEqual([4, 3, 88, 60]);
		},
	);

	it('falls back only at the minimum, with overflow based on the final wrapped result', () => {
		const label = fitted('abcdefghijklmnopqrst', 60, 40);
		expect(label.renderedSize).toBe(12);
		expect(lines(label)).toEqual(['abcdefghij', 'klmnopqrst']);
		expect(label.textFitOverflow).toBe(false);
		label.height = 16;
		validate(label);
		expect(label.renderedSize).toBe(12);
		expect(label.textFitOverflow).toBe(true);
		expect(lines(label)).toEqual(['abcdefghij', 'klmnopqrst']);
	});

	it('uses the authored size as the effective minimum when the configured minimum is larger', () => {
		const label = fitted('abcdefghijk', 60, 40);
		label.minFontSize = 24;
		validate(label);
		expect(label.renderedSize).toBe(20);
		expect(label.textFitOverflow).toBe(false);
		expect(lines(label)).toEqual(['abcdef', 'ghijk']);
	});

	it.each(['a\u00a0b', 'a\u202fb', 'a\u2060b', 'e\u0301', '👨‍👩‍👧‍👦'])(
		'preserves protected sequence %s even in minimum-size overflow', text => {
			const label = fitted(text, 3, 40);
			expect(label.renderedSize).toBe(12);
			expect(label.textFitOverflow).toBe(true);
			expect(lines(label)).toEqual([text]);
		},
	);

	it('keeps Chinese boundaries, explicit breaks and authored spacing', () => {
		const chinese = fitted('你好世界', 20, 40);
		expect(chinese.renderedSize).toBe(20);
		expect(lines(chinese)).toEqual(['你好', '世界']);
		const label = fitted('one\r\n  two\u2028', 88, 64);
		label.lineSpacing = 2;
		validate(label);
		expect(label.renderedSize).toBe(20);
		expect(lines(label)).toEqual(['one', '  two', '']);
		expect(field(label).getLinesArr().map(line => line.charNum)).toEqual([5, 6, 0]);
	});

	it('restores base size after shortening and reuses settled fitting and line caches', () => {
		const label = fitted("l'événement d'octobre");
		const shrunk = label.renderedSize;
		label.text = 'short';
		validate(label);
		expect(label.renderedSize).toBe(20);
		label.text = "l'événement d'octobre";
		validate(label);
		expect(label.renderedSize).toBe(shrunk);
		lines(label);
		canvas.measureText.mockClear();
		for (let pass = 0; pass < 8; pass++) {
			validate(label);
			lines(label);
		}
		expect(canvas.measureText).not.toHaveBeenCalled();
	});

	it('leaves ordinary wrapping, grapheme wrapping and single-line fitting unchanged', () => {
		const label = fitted('abcdefghijklmnopqrst', 60, 40);
		label.textFit = 'none';
		validate(label);
		expect(label.renderedSize).toBe(20);
		expect(lines(label)).toEqual(['abcdef', 'ghijkl', 'mnopqr', 'st']);
		label.textFit = 'shrink';
		label.wordWrap = false;
		validate(label);
		expect(label.renderedSize).toBeCloseTo(13.3, 1);
		label.multiline = false;
		label.text = 'abcdefgh';
		validate(label);
		expect(label.renderedSize).toBeCloseTo(15, 0);
		expect(lines(label)).toEqual(['abcdefgh']);
	});
});
