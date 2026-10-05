import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stage } from '@kurot/core';
import { Button, EditableText, Group, Label, SetProperty, Skin } from '../src/index.js';

class InspectableLabel extends Label {
	public get paintedWidth(): number {
		return this._textField.textWidth;
	}

	public get lines(): string[] {
		return this._textField.getLinesArr().map(line => line.elements.map(element => element.text).join(''));
	}
}

const metrics = { font: '', measureText: vi.fn() };
let fontScale = 1;

function validate(label: Label): void {
	label.validateProperties();
	label.validateSize();
	label.validateDisplayList();
}

function fitted(text = 'ABCDEFGHIJ'): InspectableLabel {
	const label = new InspectableLabel(text);
	label.width = 100;
	label.size = 30;
	label.multiline = false;
	label.textFit = 'shrink';
	validate(label);
	return label;
}

describe('Label text layout and font fitting', () => {
	beforeEach(() => {
		fontScale = 1;
		metrics.measureText.mockReset().mockImplementation((text: string) => {
			const size = Number(/([\d.]+)px/.exec(metrics.font)?.[1] ?? 30);
			const bold = metrics.font.includes('bold') ? 1.1 : 1;
			const italic = metrics.font.includes('italic') ? 1.1 : 1;
			const family = metrics.font.includes('Wide') ? 1.5 : 1;
			return { width: ((text.length * size) / 2) * bold * italic * family * fontScale };
		});
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			metrics as unknown as CanvasRenderingContext2D,
		);
	});

	afterEach(() => vi.restoreAllMocks());

	it('measures all wrapped lines at automatic height, but never wraps an explicit single line', () => {
		const label = new InspectableLabel('ABCDEFGHIJ');
		label.width = 40;
		label.size = 20;
		validate(label);
		expect(label.multiline).toBe(true);
		expect(label.lines).toEqual(['ABCD', 'EFGH', 'IJ']);
		expect(label.height).toBe(60);
		label.height = 20;
		validate(label);
		expect(label.lines).toHaveLength(3);
		label.multiline = false;
		validate(label);
		expect(label.lines).toEqual(['ABCDEFGHIJ']);
		label.height = NaN;
		validate(label);
		expect(label.height).toBe(20);
	});

	it('shrinks a constrained line and restores the authored size for shorter text', () => {
		const label = fitted();
		expect(label.renderedSize).toBeCloseTo(20, 0);
		expect(label.height).toBe(20);
		expect(label.size).toBe(30);
		expect(label.text).toBe('ABCDEFGHIJ');
		label.text = 'ABC';
		validate(label);
		expect(label.renderedSize).toBe(30);
		label.text = 'ABCDEFGHIJ';
		validate(label);
		expect(label.renderedSize).toBeCloseTo(20, 0);
	});

	it.each(['АВТОМАТИЧНЕ ВИВЕДЕННЯ', 'AUTOMATISCHE AUSZAHLUNG', '自动提现', '$100.80', 'KZT 10 000,00'])(
		'fits %s without rewriting text',
		text => {
			const label = fitted(text);
			label.minFontSize = 6;
			validate(label);
			expect(label.text).toBe(text);
			expect(label.lines).toEqual([text]);
			expect(label.renderedSize).toBeLessThanOrEqual(label.size);
			expect((text.length * label.renderedSize) / 2).toBeLessThanOrEqual(100);
			expect(label.textFitOverflow).toBe(false);
		},
	);

	it('stops at the minimum, reports remaining overflow and does not enlarge for a larger minimum', () => {
		const label = fitted('A'.repeat(30));
		expect(label.renderedSize).toBe(12);
		expect(label.textFitOverflow).toBe(true);
		label.minFontSize = 40;
		validate(label);
		expect(label.renderedSize).toBe(30);
		expect(label.textFitOverflow).toBe(true);
		label.text = 'A';
		validate(label);
		expect(label.renderedSize).toBe(30);
		expect(label.textFitOverflow).toBe(false);
	});

	it('uses fixed height and outline allowance, even when both authored axes are explicit', () => {
		const label = fitted('AB');
		label.height = 22;
		label.stroke = 2;
		validate(label);
		expect(label.renderedSize).toBeCloseTo(18, 0);
		label.height = 40;
		label.width = 20;
		validate(label);
		expect(label.renderedSize).toBeCloseTo(16, 0);
	});

	it('recomputes after font, weight, italic and unchanged-family font readiness invalidations', () => {
		const label = fitted();
		label.bold = true;
		label.italic = true;
		label.fontFamily = 'Wide';
		validate(label);
		expect(label.renderedSize).toBe(12);
		expect(label.textFitOverflow).toBe(true);
		label.bold = false;
		label.italic = false;
		label.fontFamily = 'Arial';
		validate(label);
		fontScale = 2;
		label.invalidateSize();
		validate(label);
		expect(label.renderedSize).toBe(12);
		expect(label.textFitOverflow).toBe(true);
	});

	it('refreshes underlying line metrics when a loaded font changes width but does not require shrinking', () => {
		const label = fitted('AB');
		expect(label.paintedWidth).toBe(30);
		fontScale = 2;
		label.invalidateSize();
		validate(label);
		expect(label.renderedSize).toBe(30);
		expect(label.paintedWidth).toBe(60);
	});

	it('does not turn automatic dimensions into a shrinking feedback loop', () => {
		const label = new InspectableLabel('ABCDEFGHIJ');
		label.size = 30;
		label.multiline = false;
		label.textFit = 'shrink';
		for (let pass = 0; pass < 8; pass++) {
			validate(label);
		}
		expect(label.renderedSize).toBe(30);
		expect(label.width).toBe(150);
		expect(label.height).toBe(30);
		metrics.measureText.mockClear();
		validate(label);
		expect(metrics.measureText).not.toHaveBeenCalled();
	});

	it('uses parent constraints, recovers at larger widths and settles synchronous validation', () => {
		const stage = new Stage();
		const group = new Group();
		group.width = 100;
		const label = new InspectableLabel('ABCDEFGHIJ');
		label.size = 30;
		label.multiline = false;
		label.textFit = 'shrink';
		label.left = 10;
		label.right = 10;
		group.addChild(label);
		stage.addChild(group);
		try {
			group.validateNow();
			expect(label.renderedSize).toBeCloseTo(16, 0);
			group.width = 200;
			group.validateNow();
			expect(label.renderedSize).toBe(30);
			group.width = 100;
			group.validateNow();
			expect(label.renderedSize).toBeCloseTo(16, 0);
			metrics.measureText.mockClear();
			group.validateNow();
			expect(metrics.measureText).not.toHaveBeenCalled();
		} finally {
			stage.removeChild(group);
		}
	});

	it('restores the authored state size rather than the derived drawing size', () => {
		const label = fitted();
		const host = new Button();
		const skin = new Skin();
		skin.setPart('labelDisplay', label);
		const override = new SetProperty('labelDisplay', 'size', 24);
		override.apply(host, skin);
		validate(label);
		expect(label.size).toBe(24);
		expect(label.renderedSize).toBeLessThan(24);
		override.remove(host, skin);
		validate(label);
		expect(label.size).toBe(30);
		expect(label.renderedSize).toBeCloseTo(20, 0);
	});

	it('disables shrinking for multiline or editable text and restores size when disabled', () => {
		const label = fitted();
		label.multiline = true;
		validate(label);
		expect(label.renderedSize).toBe(30);
		label.multiline = false;
		label.textFit = 'none';
		validate(label);
		expect(label.renderedSize).toBe(30);
		const input = new EditableText();
		input.text = 'A'.repeat(20);
		input.width = 40;
		expect(() => {
			input.textFit = 'shrink';
		}).toThrow(RangeError);
		validate(input);
		expect(input.multiline).toBe(false);
		expect(input.renderedSize).toBe(input.size);
	});

	it('fits the displayed first line and password glyphs, leaving the source unchanged', () => {
		const label = fitted('AB\n' + 'A'.repeat(100));
		expect(label.renderedSize).toBe(30);
		expect(label.text).toContain('\n');
		label.text = 'ABCDEFGHIJ';
		label.displayAsPassword = true;
		validate(label);
		expect(label.lines).toEqual(['**********']);
		expect(label.renderedSize).toBeCloseTo(20, 0);
	});

	it('rejects invalid fit policies and minimum sizes', () => {
		const label = new Label();
		for (const size of [0, -1, NaN, Infinity]) {
			expect(() => {
				label.minFontSize = size;
			}).toThrow(RangeError);
		}
		expect(() => {
			label.textFit = 'invalid' as 'none';
		}).toThrow(RangeError);
	});
});
