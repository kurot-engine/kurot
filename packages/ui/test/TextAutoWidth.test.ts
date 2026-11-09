import { afterEach, describe, expect, it, vi } from 'vitest';
import { Stage, TextField } from '@kurot/core';
import { Group, Label, RichLabel } from '../src/index.js';
import { mockTextMetrics } from './helpers/text-metrics.js';

mockTextMetrics();
const stages: Stage[] = [];
afterEach(() => {
	for (const stage of stages.splice(0)) {
		stage.removeChildren();
	}
});

function mount(label: Label | RichLabel): { group: Group; settle: () => void } {
	label.size = 16;
	label.left = label.right = 10;
	const group = new Group();
	group.addChild(label);
	const stage = new Stage();
	stages.push(stage);
	stage.addChild(group);
	const measure = label.measure.bind(label);
	const measured = vi.spyOn(label, 'measure').mockImplementation(() => {
		if (measured.mock.calls.length > 20) {
			throw new Error('Text layout failed to converge within 20 measurements.');
		}
		measure();
	});
	const painted = vi.spyOn(label, 'updateDisplayList');
	return { group, settle: () => {
		measured.mockClear();
		painted.mockClear();
		group.validateNow();
		const counts = [measured.mock.calls.length, painted.mock.calls.length];
		for (let pass = 0; pass < 8; pass++) {
			group.validateNow();
		}
		expect([measured.mock.calls.length, painted.mock.calls.length]).toEqual(counts);
	} };
}

function setText(label: Label | RichLabel, text: string): void {
	if (label instanceof RichLabel) {
		label.textFlow = [{ text: text.slice(0, 2), style: { textColor: 0xff0000 } }, { text: text.slice(2) }];
	} else {
		label.text = text;
	}
}

for (const Type of [Label, RichLabel]) {
	describe(`${Type.name} automatic width negotiation`, () => {
		it.each([false, true])('grows again with wordWrap=%s without changing the line policy', wordWrap => {
			const label = new Type();
			label.wordWrap = wordWrap;
			const { group, settle } = mount(label);
			for (const text of ['Specialty', 'Skill', 'Specialty', '', 'Skill', 'Specialty']) {
				setText(label, text);
				settle();
				expect(label.width).toBe(text.length * 8);
				expect(group.width).toBe(label.width + 20);
				if (text) {
					expect(label.height).toBe(16);
				}
				expect(label.multiline).toBe(true);
				expect(label.wordWrap).toBe(wordWrap);
			}
		});

		it('keeps wrapping at an unchanged parent width, then recovers on resize and release', () => {
			const label = new Type();
			const { group, settle } = mount(label);
			group.width = 60;
			for (const text of ['Specialty', 'Skill', 'Specialty']) {
				setText(label, text);
				settle();
				expect([label.width, label.height]).toEqual([40, text === 'Skill' ? 16 : 32]);
			}
			group.width = 140;
			settle();
			expect([label.width, label.height]).toEqual([120, 16]);
			group.width = 60;
			settle();
			expect([label.width, label.height]).toEqual([40, 32]);
			group.width = NaN;
			label.left = label.right = NaN;
			settle();
			expect([label.width, label.height]).toEqual([72, 16]);
		});

		it('uses current maxWidth for wrapping and restores natural width after short text', () => {
			const label = new Type();
			label.maxWidth = 80;
			const { settle } = mount(label);
			for (const text of ['Skill', 'A'.repeat(18), 'Skill', 'A'.repeat(18)]) {
				setText(label, text);
				settle();
				expect([label.width, label.height]).toEqual(text === 'Skill' ? [40, 16] : [80, 32]);
			}
			label.maxWidth = 160;
			settle();
			expect([label.width, label.height]).toEqual([144, 16]);
			label.maxWidth = 80;
			settle();
			expect([label.width, label.height]).toEqual([80, 32]);
		});

		it('retains explicit width, minimum width and font readiness invalidation', () => {
			const label = new Type();
			const { settle } = mount(label);
			label.left = label.right = NaN;
			label.width = 40;
			setText(label, 'Specialty');
			settle();
			expect([label.width, label.height]).toEqual([40, 32]);
			label.width = NaN;
			label.minWidth = 60;
			setText(label, 'Skill');
			settle();
			expect([label.width, label.height]).toEqual([60, 16]);
			label.left = label.right = 10;
			setText(label, 'Specialty');
			label.invalidateSize();
			settle();
			expect([label.width, label.height]).toEqual([72, 16]);
			const field = label.getChildAt(0);
			expect(field).toBeInstanceOf(TextField);
			if (field instanceof TextField) {
				expect(field.numLines).toBe(1);
			}
		});

		it('remeasures changed line breaks even when natural dimensions are unchanged', () => {
			const label = new Type();
			const { group, settle } = mount(label);
			group.width = 44;
			setText(label, '👩‍💻');
			settle();
			expect(label.height).toBe(16);
			setText(label, 'ABCDE');
			settle();
			expect([label.width, label.height]).toEqual([24, 32]);
		});

		it('recovers when an automatic parent relaxes its maximum width', () => {
			const label = new Type();
			const { group, settle } = mount(label);
			group.maxWidth = 60;
			setText(label, 'Specialty');
			settle();
			expect([label.width, label.height]).toEqual([40, 32]);
			group.maxWidth = 140;
			settle();
			expect([group.width, label.width, label.height]).toEqual([92, 72, 16]);
		});

		it('honors a width assigned to its parent by an ancestor', () => {
			const label = new Type();
			const { group } = mount(label);
			const stage = group.stage!;
			const outer = new Group();
			outer.width = 60;
			group.percentWidth = 100;
			outer.addChild(group);
			stage.addChild(outer);
			setText(label, 'Specialty');
			outer.validateNow();
			expect(Number.isNaN(group.$explicitWidth)).toBe(true);
			expect([label.width, label.height]).toEqual([40, 32]);
			outer.width = 140;
			outer.validateNow();
			expect([label.width, label.height]).toEqual([120, 16]);
			outer.width = 60;
			outer.validateNow();
			expect([label.width, label.height]).toEqual([40, 32]);
		});
	});
}

describe('Label automatic width with fitting', () => {
	it('retains automatic width fitting under a parent height constraint', () => {
		const label = new Label();
		label.multiline = false;
		label.textFit = 'shrink';
		label.top = label.bottom = 0;
		const { group, settle } = mount(label);
		label.size = 30;
		label.text = 'ABCDEFGHIJ';
		for (const height of [16, 30, 16]) {
			group.height = height;
			settle();
			expect(label.renderedSize).toBeCloseTo(height, 0);
			expect(label.width).toBeCloseTo(height * 5, 0);
			expect(group.width).toBe(label.width + 20);
		}
	});

	it.each([0, 2])('expands before shrinking and restores the base size with stroke=%s', stroke => {
		const label = new Label();
		label.maxWidth = 120;
		label.multiline = false;
		label.textFit = 'shrink';
		label.minFontSize = 12;
		label.stroke = stroke;
		const { group, settle } = mount(label);
		const inset = stroke ? 12 : 0;
		for (const text of ['Skill', 'Specialty', 'A'.repeat(18), 'A'.repeat(32), 'Skill', 'Specialty']) {
			label.text = text;
			settle();
			expect(label.size).toBe(16);
			expect(label.text).toBe(text);
			expect(group.width).toBe(label.width + 20);
			if (text.length < 18) {
				expect(label.width).toBe(text.length * 8 + inset);
				expect(label.renderedSize).toBe(16);
				expect(label.textFitOverflow).toBe(false);
			} else {
				expect(label.width).toBe(120);
				expect(label.renderedSize).toBe(text.length === 18 && !stroke ? 13.3 : 12);
				expect(label.textFitOverflow).toBe(text.length === 32);
			}
		}
	});

	it('respects the current parent width and recovers after a narrow allocation', () => {
		const label = new Label();
		label.maxWidth = 120;
		label.multiline = false;
		label.textFit = 'shrink';
		const { group, settle } = mount(label);
		group.width = 80;
		label.text = 'A'.repeat(18);
		settle();
		expect([label.width, label.renderedSize, label.textFitOverflow]).toEqual([60, 12, true]);
		group.width = 160;
		settle();
		expect([label.width, label.renderedSize, label.textFitOverflow]).toEqual([120, 13.3, false]);
		group.width = 80;
		settle();
		expect([label.width, label.renderedSize, label.textFitOverflow]).toEqual([60, 12, true]);
		label.text = 'Skill';
		settle();
		expect([label.width, label.renderedSize, label.textFitOverflow]).toEqual([60, 16, false]);
	});

	it('restores fitting when a parent maximum is relaxed without editing the text', () => {
		const label = new Label();
		label.maxWidth = 120;
		label.multiline = false;
		label.textFit = 'shrink';
		const { group, settle } = mount(label);
		group.maxWidth = 80;
		label.text = 'A'.repeat(18);
		settle();
		expect([label.width, label.renderedSize, label.textFitOverflow]).toEqual([60, 12, true]);
		group.maxWidth = 160;
		settle();
		expect([group.width, label.width, label.renderedSize, label.textFitOverflow]).toEqual([140, 120, 13.3, false]);
	});
});
