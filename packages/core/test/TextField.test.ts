import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextField } from '../src/index.js';

describe('TextField line layout', () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			font: '',
			measureText: (text: string) => ({ width: text.length * 10 }),
		} as unknown as CanvasRenderingContext2D);
	});

	it('does not wrap width-constrained text when multiline is false', () => {
		const field = new TextField();
		field.width = 40;
		field.size = 20;
		field.multiline = false;
		field.wordWrap = false;
		field.text = 'This is wider than forty pixels';

		expect(field.numLines).toBe(1);
	});

	it('still wraps width-constrained text when multiline is true', () => {
		const field = new TextField();
		field.width = 40;
		field.size = 20;
		field.multiline = true;
		field.wordWrap = true;
		field.text = 'This is wider than forty pixels';

		expect(field.numLines).toBeGreaterThan(1);
	});

	it('normalizes non-string runtime values before line layout', () => {
		const field = new TextField();
		field.text = { label: 'Button' } as unknown as string;

		expect(field.text).toBe('[object Object]');
		expect(() => field.textWidth).not.toThrow();

		field.text = null as unknown as string;
		expect(field.text).toBe('');
	});
});
