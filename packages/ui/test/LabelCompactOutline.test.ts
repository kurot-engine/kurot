import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextField } from '@kurot/core';
import { Label } from '../src/index.js';
import { createTextMetrics } from './helpers/text-metrics.js';

function validate(label: Label): void {
	label.validateProperties();
	label.validateSize();
	label.validateDisplayList();
}

describe('compact Label outline bounds', () => {
	beforeEach(() => {
		const context = {
			font: '',
			measureText(text: string): TextMetrics {
				const size = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 24);
				return {
					...createTextMetrics((text.length * size) / 2),
					fontBoundingBoxAscent: size,
					fontBoundingBoxDescent: 5,
				};
			},
		};
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			context as unknown as CanvasRenderingContext2D,
		);
	});

	afterEach(() => vi.restoreAllMocks());

	it('keeps a 24px, 2px outline Label at a 29px font frame plus 8px rather than 41px', () => {
		const label = new Label('GAME RULE');
		label.size = 24;
		label.stroke = 2;
		label.createChildren();
		validate(label);
		const field = label.getChildAt(0);
		expect(field).toBeInstanceOf(TextField);
		expect(label.height).toBe(37);
	});

	it.each([
		[0, 29],
		[0.25, 35],
		[0.5, 35],
		[1, 35],
		[2, 37],
		[6, 45],
	])('stroke %s has a stable automatic height of %s including fractional stroke rounding', (stroke, height) => {
		const label = new Label('GAME RULE');
		label.size = 24;
		label.stroke = stroke;
		validate(label);
		expect(label.height).toBe(height);
		label.text = 'gy';
		validate(label);
		expect(label.height).toBe(height);
	});

	it('keeps italic insets tied to authored size while fitting, retyping and recovering', () => {
		const label = new Label('GAME RULE');
		label.size = 24;
		label.stroke = 2;
		label.italic = true;
		label.textFit = 'shrink';
		label.width = 120;
		label.height = 30;
		label.createChildren();
		validate(label);
		const field = label.getChildAt(0);
		if (!(field instanceof TextField)) {
			throw new Error('Missing Label field.');
		}
		expect([field.x, field.y, field.width, field.height]).toEqual([12, 4, 96, 22]);
		expect(label.renderedSize).toBeLessThanOrEqual(17);
		expect(label.textFitOverflow).toBe(false);
		label.text = 'A';
		validate(label);
		expect([field.x, field.y]).toEqual([12, 4]);
		label.height = 50;
		validate(label);
		expect(label.renderedSize).toBe(24);
		expect([field.x, field.y]).toEqual([12, 4]);
	});
});
