import { afterEach, describe, expect, it } from 'vitest';
import { Stage, TextField } from '@kurot/core';
import { Group, HorizontalLayout, Label, RichLabel } from '../src/index.js';
import { mockTextMetrics } from './helpers/text-metrics.js';

mockTextMetrics();
const stages: Stage[] = [];
afterEach(() => {
	for (const stage of stages.splice(0)) {
		stage.removeChildren();
	}
});

function fieldOf(label: Label | RichLabel): TextField {
	const field = label.getChildAt(0);
	if (!(field instanceof TextField)) {
		throw new Error('Expected the component text field.');
	}
	return field;
}

function mountPair(text = 'Specialty'): { row: Group; label: Label; rich: RichLabel; layout: HorizontalLayout } {
	const label = new Label(text);
	const rich = new RichLabel([{ text }]);
	const row = new Group();
	const layout = new HorizontalLayout();
	row.layout = layout;
	for (const component of [label, rich]) {
		component.size = 16;
		component.verticalAlign = 'top';
		row.addChild(component);
	}
	const stage = new Stage();
	stages.push(stage);
	stage.addChild(row);
	return { row, label, rich, layout };
}

describe('Label and RichLabel outline layout contracts', () => {
	it.each([false, true])('keeps line frames separate from outline layout space, multiline=%s', multiline => {
		const { row, label, rich } = mountPair(multiline ? 'Specialty\nSkill' : 'Specialty');
		for (const stroke of [0, 0.5, 1, 2, 6, 0]) {
			for (const component of [label, rich]) {
				component.multiline = multiline;
				component.stroke = stroke;
			}
			row.validateNow();
			const plainField = fieldOf(label);
			const richField = fieldOf(rich);
			const inset = stroke > 0 ? Math.ceil(stroke) + 2 : 0;
			const contentHeight = multiline ? 32 : 16;
			expect([plainField.textHeight, richField.textHeight]).toEqual([contentHeight, contentHeight]);
			expect([label.height, rich.height]).toEqual([contentHeight + 2 * inset, contentHeight]);
			expect([label.y, rich.y, plainField.y, richField.y]).toEqual([0, 0, inset, 0]);
			expect(plainField.getLinesArr().map(line => line.baseline))
				.toEqual(richField.getLinesArr().map(line => line.baseline));
		}
	});

	it('centers equal single-line font frames without changing either automatic height', () => {
		const { row, label, rich, layout } = mountPair();
		label.multiline = rich.multiline = false;
		layout.verticalAlign = 'middle';
		for (const stroke of [0, 0.5, 1, 2, 6]) {
			label.stroke = rich.stroke = stroke;
			row.validateNow();
			const plainField = fieldOf(label);
			const richField = fieldOf(rich);
			expect(label.y + plainField.y + plainField.getLinesArr()[0].baseline)
				.toBe(rich.y + richField.y + richField.getLinesArr()[0].baseline);
			expect(rich.height).toBe(16);
		}
	});

	it('retains fixed outer bounds and aligns text inside the respective content regions', () => {
		const { row, label, rich } = mountPair();
		for (const component of [label, rich]) {
			component.width = 120;
			component.height = 40;
			component.stroke = 1;
			component.multiline = false;
		}
		row.validateNow();
		const plainField = fieldOf(label);
		const richField = fieldOf(rich);
		expect([plainField.x, plainField.y, plainField.width, plainField.height]).toEqual([4, 3, 112, 34]);
		expect([richField.x, richField.y, richField.width, richField.height]).toEqual([0, 0, 120, 40]);
		expect([label.width, label.height, rich.width, rich.height]).toEqual([120, 40, 120, 40]);
		expect([plainField.textHeight, richField.textHeight]).toEqual([16, 16]);
	});
});
