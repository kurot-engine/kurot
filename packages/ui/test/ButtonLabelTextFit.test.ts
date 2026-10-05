import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stage } from '@kurot/core';
import { Button, Label, SetProperty, Skin, State } from '../src/index.js';

const metrics = {
	font: '',
	measureText: vi.fn(function (this: { font: string }, text: string): { width: number } {
		const size = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 30);
		const weight = this.font.includes('bold') ? 1.25 : 1;
		return { width: (text.length * size * weight) / 2 };
	}),
};

function buttonSkin(size = 30): { skin: Skin; label: Label } {
	const label = new Label();
	label.size = size;
	label.multiline = false;
	label.textFit = 'shrink';
	label.minFontSize = 12;
	label.left = 50;
	label.right = 10;
	label.verticalCenter = 0;

	const skin = new Skin();
	skin.setPart('labelDisplay', label);
	skin.skinParts = ['labelDisplay'];
	skin.elementsContent = [label];
	skin.states = [
		new State('up'),
		new State('disabled', [
			new SetProperty('labelDisplay', 'size', 24),
			new SetProperty('labelDisplay', 'bold', true),
		]),
	];
	return { skin, label };
}

function button(skin: Skin): Button {
	const result = new Button();
	result.width = 160;
	result.height = 44;
	result.label = 'ABCDEFGHIJ';
	result.skinName = skin;
	return result;
}

describe('Button labelDisplay font fitting', () => {
	beforeEach(() => {
		metrics.measureText.mockClear();
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			metrics as unknown as CanvasRenderingContext2D,
		);
	});

	afterEach(() => vi.restoreAllMocks());

	it('uses the label region, updates changing content and restores the base size after state changes', () => {
		const stage = new Stage();
		const { skin, label } = buttonSkin();
		const host = button(skin);
		stage.addChild(host);
		try {
			host.validateNow();
			expect(host.labelDisplay).toBe(label);
			expect(label.width).toBe(100);
			expect(label.size).toBe(30);
			expect(label.renderedSize).toBeCloseTo(20, 0);

			host.enabled = false;
			host.validateNow();
			expect(skin.currentState).toBe('disabled');
			expect(label.size).toBe(24);
			expect(label.bold).toBe(true);
			expect(label.renderedSize).toBeCloseTo(16, 0);

			host.enabled = true;
			host.label = 'ABC';
			host.validateNow();
			expect(label.size).toBe(30);
			expect(label.bold).toBe(false);
			expect(label.renderedSize).toBe(30);

			host.label = 'ABCDEFGHIJ';
			host.validateNow();
			expect(label.renderedSize).toBeCloseTo(20, 0);
			expect(host.label).toBe('ABCDEFGHIJ');
			expect(label.textFitOverflow).toBe(false);
			metrics.measureText.mockClear();
			host.validateNow();
			expect(metrics.measureText).not.toHaveBeenCalled();
		} finally {
			stage.removeChild(host);
		}
	});

	it('preserves current content when replacing a skin and fits only the active label', () => {
		const stage = new Stage();
		const initial = buttonSkin();
		const replacement = buttonSkin(36);
		const host = button(initial.skin);
		stage.addChild(host);
		try {
			host.validateNow();
			host.skinName = replacement.skin;
			host.validateNow();
			expect(host.labelDisplay).toBe(replacement.label);
			expect(initial.label.parent).toBeUndefined();
			expect(initial.skin.hostComponent).toBeUndefined();
			expect(replacement.label.text).toBe('ABCDEFGHIJ');
			expect(replacement.label.size).toBe(36);
			expect(replacement.label.renderedSize).toBeCloseTo(20, 0);

			host.label = 'ABC';
			host.validateNow();
			expect(replacement.label.renderedSize).toBe(36);
			expect(initial.label.text).toBe('ABCDEFGHIJ');
		} finally {
			stage.removeChild(host);
		}
	});
});
