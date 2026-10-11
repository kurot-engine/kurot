import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stage, TextField } from '@kurot/core';
import { Button, EditableText, Group, Label, SetProperty, Skin } from '../src/index.js';

class InspectableLabel extends Label {
	public get field(): TextField {
		return this._textField;
	}
}

const context = { font: '', measureText: vi.fn() };
let widthScale = 1;
let tallInk = false;

function validate(label: Label): void {
	label.validateProperties();
	label.validateSize();
	label.validateDisplayList();
}

function outlined(text = 'ABCD'): InspectableLabel {
	const label = new InspectableLabel(text);
	label.size = 20;
	label.stroke = 2;
	label.verticalAlign = 'top';
	return label;
}

function region(label: InspectableLabel): number[] {
	const field = label.field;
	return [field.x, field.y, field.width, field.height];
}

function firstBaseline(label: InspectableLabel): number {
	const lines = label.field.getLinesArr();
	let top = Infinity;
	let offset = 0;
	for (const line of lines) {
		top = Math.min(top, offset + line.baseline - line.inkAscent);
		offset += line.height + label.lineSpacing;
	}
	return label.field.y + lines[0].baseline - top;
}

describe('outlined Label layout', () => {
	beforeEach(() => {
		widthScale = 1;
		tallInk = false;
		context.measureText.mockReset().mockImplementation((text: string) => {
			const size = Number(/([\d.]+)px/.exec(context.font)?.[1] ?? 30);
			return {
				width: (text.length * size * widthScale) / 2,
				fontBoundingBoxAscent: size * 0.8,
				fontBoundingBoxDescent: size * 0.2,
				actualBoundingBoxAscent: text ? size * (tallInk ? 0.9 : 0.7) : 0,
				actualBoundingBoxDescent: text ? size * (tallInk ? 0.4 : text.includes('y') ? 0.2 : 0) : 0,
			};
		});
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			context as unknown as CanvasRenderingContext2D,
		);
	});
	afterEach(() => vi.restoreAllMocks());

	it('contains outlines in automatic dimensions and removes the inset for empty or unoutlined text', () => {
		const label = outlined();
		validate(label);
		expect([label.width, label.height]).toEqual([52, 32]);
		expect(region(label)).toEqual([6, 6, 40, 20]);
		label.text = '';
		validate(label);
		expect([label.width, label.height]).toEqual([0, 20]);
		expect(region(label)).toEqual([0, 0, 0, 20]);
		label.text = 'ABCD';
		label.stroke = 0;
		validate(label);
		expect([label.width, label.height]).toEqual([40, 20]);
		expect(region(label)).toEqual([0, 0, 40, 20]);
	});

	it.each(['none', 'shrink'] as const)(
		'adds no outline inset to an empty displayed first line with fitting %s',
		fitting => {
			const label = outlined('\nhidden content');
			label.multiline = false;
			label.textFit = fitting;
			validate(label);
			expect([label.width, label.height]).toEqual([0, 20]);
			expect(region(label).slice(0, 2)).toEqual([0, 0]);
			expect([label.renderedSize, label.textFitOverflow]).toEqual([20, false]);
		},
	);

	it.each(['width', 'maximum'])('wraps inside %s bounds and measures the resulting rows plus one inset', bounds => {
		const label = outlined();
		if (bounds === 'width') {
			label.width = 32;
		} else {
			label.maxWidth = 32;
		}
		validate(label);
		expect(label.field.getLinesArr().map(line => line.elements.map(run => run.text).join(''))).toEqual([
			'AB',
			'CD',
		]);
		expect([label.width, label.height]).toEqual([32, 52]);
		expect(region(label)).toEqual([6, 6, 20, 40]);
		label.width = 52;
		label.maxWidth = 100000;
		validate(label);
		expect(label.height).toBe(32);
	});

	it('retains explicit single-line mode and hard breaks, blank rows and line spacing in multiline mode', () => {
		const label = outlined('A\n\nB\n');
		label.lineSpacing = 3;
		validate(label);
		expect(label.height).toBe(101);
		expect(label.field.numLines).toBe(4);
		label.multiline = false;
		label.width = 15;
		validate(label);
		expect(label.field.numLines).toBe(1);
		expect(label.height).toBe(32);
	});

	it('includes ink taller than nominal rows and uses the same height for fitting', () => {
		tallInk = true;
		const label = outlined('字');
		validate(label);
		expect(label.field.textHeight).toBe(20);
		expect(label.height).toBe(38);
		label.height = 32;
		label.textFit = 'shrink';
		validate(label);
		expect(label.renderedSize).toBeCloseTo(15.3, 1);
		expect(label.field.getLinesArr()[0].inkAscent + label.field.getLinesArr()[0].inkDescent).toBeLessThanOrEqual(
			20,
		);
		expect(label.textFitOverflow).toBe(false);
	});

	it('fits both axes, recovers after resizing and reports minimum-size overflow without shrinking repeatedly', () => {
		const label = outlined('ABCDEFGHIJ');
		label.width = 44;
		label.height = 36;
		label.textFit = 'shrink';
		for (let pass = 0; pass < 8; pass++) {
			validate(label);
		}
		expect([label.renderedSize, label.field.numLines, label.textFitOverflow]).toEqual([12, 2, false]);
		context.measureText.mockClear();
		validate(label);
		expect(context.measureText).not.toHaveBeenCalled();
		label.width = 112;
		label.height = 32;
		validate(label);
		expect(label.renderedSize).toBe(20);
		label.height = 10;
		validate(label);
		expect([label.renderedSize, label.textFitOverflow, label.field.height]).toEqual([12, true, 0]);
	});

	it('revalidates after a late font becomes wider and taller', () => {
		const label = outlined();
		label.width = 52;
		label.height = 32;
		label.textFit = 'shrink';
		validate(label);
		widthScale = 1.5;
		tallInk = true;
		label.invalidateSize();
		validate(label);
		expect(label.renderedSize).toBeCloseTo(13.3, 1);
		expect(label.field.numLines).toBe(1);
		expect(label.textFitOverflow).toBe(false);
	});

	it('keeps a top-aligned typewriter origin and baseline stable after wrapping, clearing and restarting', () => {
		const label = outlined('Hey '.repeat(20));
		label.width = 92;
		label.wordWrap = true;
		validate(label);
		expect(label.field.numLines).toBeGreaterThan(1);
		for (let sentence = 0; sentence < 2; sentence++) {
			label.text = '';
			validate(label);
			let baseline: number | undefined;
			for (const text of ['H', 'He', 'Hey', 'Hey there', 'Hey there again']) {
				label.text = text;
				validate(label);
				baseline ??= firstBaseline(label);
				expect(firstBaseline(label)).toBe(baseline);
				expect(region(label).slice(0, 2)).toEqual([6, 6]);
			}
		}
	});

	it('settles automatic parent height after width changes without measurement feedback', () => {
		const stage = new Stage();
		const group = new Group();
		group.width = 44;
		const label = outlined();
		label.left = label.right = 0;
		group.addChild(label);
		stage.addChild(group);
		try {
			group.validateNow();
			expect([group.height, label.height, label.field.numLines]).toEqual([52, 52, 2]);
			group.width = 52;
			group.validateNow();
			expect([group.height, label.height, label.field.numLines]).toEqual([32, 32, 1]);
			context.measureText.mockClear();
			group.validateNow();
			expect(context.measureText).not.toHaveBeenCalled();
		} finally {
			stage.removeChild(group);
		}
	});

	it('restores state outline overrides and retains the native EditableText viewport', () => {
		const label = outlined();
		const host = new Button();
		const skin = new Skin();
		skin.setPart('caption', label);
		const override = new SetProperty('caption', 'stroke', 0);
		override.apply(host, skin);
		validate(label);
		expect([label.width, label.height]).toEqual([40, 20]);
		override.remove(host, skin);
		validate(label);
		expect([label.width, label.height]).toEqual([52, 32]);
		const editable = new EditableText();
		editable.text = 'ABCD';
		editable.size = 20;
		editable.stroke = 6;
		editable.width = 80;
		editable.height = 30;
		editable.createChildren();
		validate(editable);
		const field = editable.getChildAt(0);
		expect(field).toBeInstanceOf(TextField);
		expect([field.x, field.y, field.width, field.height]).toEqual([0, 0, 80, 30]);
	});
});
