import { describe, expect, it } from 'vitest';
import { BitmapText, TextField } from '@kurot/core';
import { BitmapLabel, EditableText, Label, RichLabel } from '../src/index.js';

describe('native text-component alignment', () => {
	it.each([Label, RichLabel, EditableText])('%s inherits its Core TextField alignment', Component => {
		const label = new Component();
		expect(label.verticalAlign).toBe(new TextField().verticalAlign);
		label.multiline = false;
		expect(label.verticalAlign).toBe(new TextField().verticalAlign);
		label.multiline = true;
		expect(label.verticalAlign).toBe(new TextField().verticalAlign);
	});

	it('BitmapLabel inherits its Core BitmapText alignment', () => {
		const label = new BitmapLabel();
		expect(label.verticalAlign).toBe(new BitmapText().verticalAlign);
		label.multiline = false;
		expect(label.verticalAlign).toBe(new BitmapText().verticalAlign);
	});

	it.each([Label, RichLabel, EditableText, BitmapLabel])('%s preserves authored top and bottom in either line mode', Component => {
		const label = new Component();
		for (const alignment of ['top', 'bottom'] as const) {
			label.verticalAlign = alignment;
			label.multiline = false;
			expect(label.verticalAlign).toBe(alignment);
			label.multiline = true;
			expect(label.verticalAlign).toBe(alignment);
		}
	});
});
