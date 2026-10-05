import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stage } from '@kurot/core';
import { Group, Label } from '../src/index.js';

const metrics = {
	font: '',
	measureText: vi.fn(function (this: { font: string }, text: string): { width: number } {
		return { width: (text.length * Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 30)) / 2 };
	}),
};

function label(): Label {
	const result = new Label('ABCDEFGHIJ');
	result.size = 30;
	result.multiline = false;
	result.textFit = 'shrink';
	return result;
}

function validate(result: Label): void {
	result.validateSize();
	result.validateDisplayList();
}

describe('Label fitting external bounds', () => {
	beforeEach(() => {
		metrics.measureText.mockClear();
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			metrics as unknown as CanvasRenderingContext2D,
		);
	});
	afterEach(() => vi.restoreAllMocks());

	it('does not repeatedly shrink outlined auto-sized text with maximum dimensions', () => {
		const result = label();
		result.stroke = 2;
		result.maxWidth = 100;
		result.maxHeight = 22;
		for (let pass = 0; pass < 8; pass++) {
			validate(result);
		}
		expect(result.renderedSize).toBeCloseTo(18, 0);
		expect(result.textFitOverflow).toBe(false);
		metrics.measureText.mockClear();
		validate(result);
		expect(metrics.measureText).not.toHaveBeenCalled();
	});

	it.each([1, 0.5, 2])('settles parent constraints with scaleX %s and local size limits', scale => {
		const stage = new Stage();
		const group = new Group();
		group.width = 200;
		const result = label();
		result.maxWidth = 100;
		result.scaleX = scale;
		result.left = 10;
		result.right = 10;
		group.addChild(result);
		stage.addChild(group);
		try {
			group.validateNow();
			expect(result.renderedSize).toBeGreaterThanOrEqual(result.minFontSize);
			expect(result.renderedSize).toBeLessThanOrEqual(20);
			expect(result.renderedSize * 5).toBeLessThanOrEqual(result.width);
			metrics.measureText.mockClear();
			group.validateNow();
			expect(metrics.measureText).not.toHaveBeenCalled();
		} finally {
			stage.removeChild(group);
		}
	});

	it('treats zero width as constrained and restores size when the bound is removed', () => {
		const result = label();
		result.width = 0;
		validate(result);
		expect(result.renderedSize).toBe(12);
		expect(result.textFitOverflow).toBe(true);
		result.width = NaN;
		validate(result);
		expect(result.renderedSize).toBe(30);
		expect(result.textFitOverflow).toBe(false);
	});

	it('does not round below a fractional minimum', () => {
		const result = label();
		result.width = 10;
		result.minFontSize = 12.05;
		validate(result);
		expect(result.renderedSize).toBe(12.05);
		expect(result.textFitOverflow).toBe(true);
	});
});
