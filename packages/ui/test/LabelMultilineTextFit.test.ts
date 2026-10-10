import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stage } from '@kurot/core';
import { Group, Label } from '../src/index.js';

class InspectableLabel extends Label {
	public get lines(): string[] {
		return this._textField.getLinesArr().map(line => line.elements.map(element => element.text).join(''));
	}

	public get contentBounds(): { width: number; height: number } {
		return this._textField.measureText(this._textField.width);
	}

	public get textRegion(): number[] {
		return [this._textField.x, this._textField.y, this._textField.width, this._textField.height];
	}
}

const context = { font: '', measureText: vi.fn() };
let fontScale = 1;

function validate(label: Label): void {
	label.validateProperties();
	label.validateSize();
	label.validateDisplayList();
}

function fitted(text = 'ABCDEFGHIJ'): InspectableLabel {
	const label = new InspectableLabel(text);
	label.size = 20;
	label.textFit = 'shrink';
	return label;
}

describe('multiline Label font fitting', () => {
	beforeEach(() => {
		fontScale = 1;
		context.measureText.mockReset().mockImplementation((text: string) => {
			const size = Number(/([\d.]+)px/.exec(context.font)?.[1] ?? 30);
			return { width: (text.length * size * fontScale) / 2 };
		});
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			context as unknown as CanvasRenderingContext2D,
		);
	});

	afterEach(() => vi.restoreAllMocks());

	it('retains the base size when multiple lines already fit', () => {
		const label = fitted();
		label.width = 40;
		label.height = 60;
		validate(label);
		expect(label.multiline).toBe(true);
		expect(label.renderedSize).toBe(20);
		expect(label.lines).toEqual(['ABCD', 'EFGH', 'IJ']);
		expect(label.textFitOverflow).toBe(false);
	});

	it('reflows each size and fits complete content before height clipping', () => {
		const label = fitted();
		label.width = 40;
		label.height = 32;
		validate(label);
		expect(label.renderedSize).toBeCloseTo(16, 0);
		expect(label.lines).toEqual(['ABCDE', 'FGHIJ']);
		expect(label.contentBounds.height).toBeLessThanOrEqual(32);
		expect(label.text).toBe('ABCDEFGHIJ');
		expect(label.size).toBe(20);
		label.textFit = 'none';
		validate(label);
		expect(label.renderedSize).toBe(20);
		expect(label.lines).toHaveLength(3);
		label.textFit = 'shrink';
		label.text = 'AB';
		validate(label);
		expect(label.renderedSize).toBe(20);
	});

	it('keeps automatic axes unconstrained and updates automatic height on width changes', () => {
		const label = fitted();
		validate(label);
		expect([label.width, label.height, label.renderedSize]).toEqual([100, 20, 20]);
		label.width = 40;
		validate(label);
		expect([label.height, label.renderedSize]).toEqual([60, 20]);
		label.width = 100;
		validate(label);
		expect([label.height, label.renderedSize]).toEqual([20, 20]);
		label.width = NaN;
		label.height = 16;
		validate(label);
		expect(label.renderedSize).toBeCloseTo(16, 0);
		expect(label.lines).toHaveLength(1);
		expect(label.width).toBeCloseTo(80, 0);
	});

	it('includes hard breaks, blank rows, trailing rows and line spacing', () => {
		const label = fitted('A\n\nB\n');
		label.width = 100;
		label.height = 62;
		label.lineSpacing = 2;
		validate(label);
		expect(label.renderedSize).toBeCloseTo(14, 0);
		expect(label.lines).toEqual(['A', '', 'B', '']);
		expect(label.contentBounds.height).toBeLessThanOrEqual(62);
		label.lineSpacing = 0;
		validate(label);
		expect(label.renderedSize).toBeCloseTo(15.5, 0);
		label.multiline = false;
		validate(label);
		expect(label.renderedSize).toBe(20);
		expect(label.lines).toEqual(['A']);
	});

	it('honors word boundaries and recalculates when the wrapping policy changes', () => {
		const label = fitted('AAAA BBBB CCCC');
		label.width = 70;
		label.height = 40;
		label.wordWrap = true;
		validate(label);
		expect(label.renderedSize).toBeLessThan(20);
		expect(label.contentBounds.height).toBeLessThanOrEqual(40);
		label.wordWrap = false;
		validate(label);
		expect(label.renderedSize).toBe(20);
		expect(label.lines).toHaveLength(2);
	});

	it('reserves outline space without padding automatic bounds or applying it twice', () => {
		const label = fitted();
		label.maxWidth = 44;
		label.maxHeight = 36;
		label.stroke = 2;
		for (let pass = 0; pass < 8; pass++) {
			validate(label);
		}
		expect(label.renderedSize).toBeCloseTo(16, 0);
		expect(label.contentBounds.height + 4).toBeLessThanOrEqual(36);
		expect(label.contentBounds.width + 4).toBeLessThanOrEqual(44);
		expect(label.textRegion).toEqual([0, 0, label.width, label.height]);
		expect(label.width).toBeCloseTo(40, 0);
		expect(label.height).toBeCloseTo(32, 0);
		expect(label.textFitOverflow).toBe(false);
		context.measureText.mockClear();
		validate(label);
		expect(context.measureText).not.toHaveBeenCalled();
		label.textFit = 'none';
		validate(label);
		expect(label.textRegion.slice(0, 2)).toEqual([0, 0]);
	});

	it.each(['Доказуемая честность', '自动提现设置', '👩‍💻👩‍💻👩‍💻'])(
		'fits %s without changing text or breaking graphemes',
		text => {
			const label = fitted(text);
			label.width = 80;
			label.height = 40;
			label.minFontSize = 6;
			label.wordWrap = true;
			validate(label);
			expect(label.text).toBe(text);
			expect(label.contentBounds.width).toBeLessThanOrEqual(80);
			expect(label.contentBounds.height).toBeLessThanOrEqual(40);
			expect(label.textFitOverflow).toBe(false);
			if (text.includes('👩‍💻')) {
				expect(label.lines.every(line => /^(👩‍💻)+$/u.test(line))).toBe(true);
			}
		},
	);

	it('reports minimum and zero-area overflow, but leaves empty content at the base size', () => {
		const label = fitted();
		label.width = 40;
		label.height = 10;
		validate(label);
		expect(label.renderedSize).toBe(12);
		expect(label.textFitOverflow).toBe(true);
		label.height = 100;
		label.width = 0;
		validate(label);
		expect(label.textFitOverflow).toBe(true);
		label.width = 4;
		label.stroke = 2;
		validate(label);
		expect(label.textFitOverflow).toBe(true);
		label.text = '';
		validate(label);
		expect(label.renderedSize).toBe(20);
		expect(label.textFitOverflow).toBe(false);
	});

	it('refits font readiness and password glyphs without retaining an old row layout', () => {
		const label = fitted();
		label.width = 40;
		label.height = 32;
		label.displayAsPassword = true;
		validate(label);
		expect(label.lines.join('')).toBe('**********');
		fontScale = 2;
		label.invalidateSize();
		validate(label);
		expect(label.renderedSize).toBe(12);
		expect(label.textFitOverflow).toBe(true);
		expect(label.text).toBe('ABCDEFGHIJ');
	});

	it('settles parent width and height constraints and restores the base size after resizing', () => {
		const stage = new Stage();
		const group = new Group();
		group.width = 60;
		group.height = 52;
		const label = fitted();
		label.left = label.right = label.top = label.bottom = 10;
		group.addChild(label);
		stage.addChild(group);
		try {
			group.validateNow();
			expect(label.renderedSize).toBeCloseTo(16, 0);
			group.width = 120;
			group.validateNow();
			expect(label.renderedSize).toBe(20);
			group.width = 60;
			group.validateNow();
			expect(label.renderedSize).toBeCloseTo(16, 0);
			context.measureText.mockClear();
			group.validateNow();
			expect(context.measureText).not.toHaveBeenCalled();
		} finally {
			stage.removeChild(group);
		}
	});
});
