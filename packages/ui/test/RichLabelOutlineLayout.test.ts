import { afterEach, describe, expect, it } from 'vitest';
import { Stage, TextField } from '@kurot/core';
import { Group, HorizontalLayout, Label, RichLabel, UIContext } from '../src/index.js';
import { mockTextMetrics } from './helpers/text-metrics.js';

mockTextMetrics();
const stages: Stage[] = [];
afterEach(() => {
	RichLabel.defaultOutlineLayout = 'render-only';
	for (const stage of stages.splice(0)) {
		stage.removeChildren();
	}
});

function mount(...labels: (Label | RichLabel)[]): Group {
	const group = new Group();
	for (const label of labels) {
		group.addChild(label);
	}
	const stage = new Stage();
	stages.push(stage);
	stage.addChild(group);
	group.validateNow();
	return group;
}

function fieldOf(label: Label | RichLabel): TextField {
	const field = label.getChildAt(0);
	if (!(field instanceof TextField)) {
		throw new Error('Expected TextField');
	}
	return field;
}

function bounds(label: Label | RichLabel): number[] {
	const field = fieldOf(label);
	return [label.width, label.height, field.x, field.y, field.width, field.height];
}

describe('RichLabel outline layout policy', () => {
	it('preserves the default and captures startup policy only for new instances', () => {
		const old = new RichLabel([{ text: 'AB' }]);
		expect(old.outlineLayout).toBe('render-only');
		RichLabel.defaultOutlineLayout = 'reserve-space';
		const current = new RichLabel([{ text: 'AB' }]);
		for (const label of [old, current]) {
			label.size = 16;
			label.stroke = 1;
		}
		const group = mount(old, current);
		expect(bounds(old)).toEqual([16, 16, 0, 0, 16, 16]);
		expect(bounds(current)).toEqual([24, 22, 4, 3, 16, 16]);
		RichLabel.defaultOutlineLayout = 'render-only';
		group.validateNow();
		expect(current.outlineLayout).toBe('reserve-space');
		current.outlineLayout = 'render-only';
		group.validateNow();
		expect(bounds(current)).toEqual(bounds(old));
	});

	it('captures context policy and allows an instance override without affecting siblings', () => {
		const options = { skins: {}, assetAdapter: { getAsset() {} } };
		const safe = new UIContext({ ...options, richLabelOutlineLayout: 'reserve-space' });
		const native = new UIContext({ ...options, richLabelOutlineLayout: 'render-only' });
		RichLabel.defaultOutlineLayout = 'reserve-space';
		const a = safe.run(() => new RichLabel());
		const b = native.run(() => new RichLabel());
		expect([a.outlineLayout, b.outlineLayout]).toEqual(['reserve-space', 'render-only']);
		a.outlineLayout = 'render-only';
		expect(safe.run(() => new RichLabel()).outlineLayout).toBe('reserve-space');
		const preexisting = new RichLabel();
		native.bind(preexisting);
		expect(preexisting.outlineLayout).toBe('reserve-space');
	});

	it.each([0, 0.5, 1, 2, 6])('matches Label geometry and wrapping with stroke=%s', stroke => {
		const text = 'abcdefghijklmnopqrstuv';
		const label = new Label(text);
		const rich = new RichLabel([{ text }]);
		rich.outlineLayout = 'reserve-space';
		for (const component of [label, rich]) {
			component.width = 180;
			component.size = 16;
			component.stroke = stroke;
			component.wordWrap = false;
			component.verticalAlign = 'top';
		}
		mount(label, rich);
		expect(bounds(rich)).toEqual(bounds(label));
		expect(fieldOf(rich).getLinesArr()).toEqual(fieldOf(label).getLinesArr());
		if (stroke === 1) {
			expect(bounds(rich)).toEqual([180, 38, 4, 3, 172, 32]);
			expect([rich.textWidth, rich.textHeight]).toEqual([168, 32]);
		}
	});

	it('remeasures content and parent height when outline changes at an unchanged outer width', () => {
		const rich = new RichLabel([{ text: 'abcdefghijklmnopqrstuv' }]);
		rich.outlineLayout = 'reserve-space';
		rich.width = 180;
		rich.size = 16;
		rich.wordWrap = false;
		const group = mount(rich);
		for (const [stroke, height] of [[0, 16], [1, 38], [6, 48], [0, 16]]) {
			rich.stroke = stroke;
			group.validateNow();
			expect(rich.height).toBe(height);
			expect(group.height).toBe(height);
		}
	});

	it('aligns the content frames of adjacent top-aligned Label and RichLabel', () => {
		const label = new Label('Specialty');
		const rich = new RichLabel([{ text: 'Specialty' }]);
		rich.outlineLayout = 'reserve-space';
		for (const component of [label, rich]) {
			component.size = 16;
			component.stroke = 1;
			component.verticalAlign = 'top';
		}
		const group = mount(label, rich);
		group.layout = new HorizontalLayout();
		group.validateNow();
		expect(rich.x).toBeGreaterThan(label.x + label.width);
		expect(label.y + fieldOf(label).y).toBe(rich.y + fieldOf(rich).y);
		expect(fieldOf(label).getLinesArr()[0].baseline).toBe(fieldOf(rich).getLinesArr()[0].baseline);
	});

	it('takes per-run maxima without combining unrelated stroke and font size', () => {
		const flow = [
			{ text: 'A', style: { size: 16, stroke: 6, italic: false } },
			{ text: 'B', style: { size: 80, stroke: 0, italic: true } },
			{ text: '', style: { size: 200, stroke: 100 } },
		];
		const rich = new RichLabel(flow);
		rich.outlineLayout = 'reserve-space';
		rich.size = 16;
		mount(rich);
		expect([fieldOf(rich).x, fieldOf(rich).y]).toEqual([22, 8]);
		expect(rich.height).toBe(96);
		expect(rich.textFlow).toEqual(flow);
	});

	it('honors local zero/false overrides and reflows on italic or size changes', () => {
		const rich = new RichLabel([{ text: 'AB', style: { stroke: 0, italic: false } }]);
		rich.outlineLayout = 'reserve-space';
		rich.size = 16;
		rich.stroke = 6;
		rich.italic = true;
		const group = mount(rich);
		expect(bounds(rich)).toEqual([16, 16, 0, 0, 16, 16]);
		rich.textFlow = [{ text: 'AB' }];
		group.validateNow();
		expect(fieldOf(rich).x).toBe(18);
		rich.size = 24;
		group.validateNow();
		expect(fieldOf(rich).x).toBe(20);
		rich.italic = false;
		group.validateNow();
		expect(fieldOf(rich).x).toBe(14);
	});

	it.each(['\n', '\r\n', '\v', '\f', '\u0085', '\u2028', '\u2029'])(
		'ignores hidden single-line styles beyond %j and includes them in multiline layout', separator => {
			const rich = new RichLabel([
				{ text: 'AB', style: { stroke: 1 } },
				{ text: `${separator}C`, style: { stroke: 6 } },
			]);
			rich.size = 16;
			rich.multiline = false;
			rich.outlineLayout = 'reserve-space';
			const group = mount(rich);
			expect(bounds(rich)).toEqual([24, 22, 4, 3, 16, 16]);
			rich.multiline = true;
			rich.lineSpacing = 4;
			group.validateNow();
			expect(rich.height).toBe(52);
			expect([fieldOf(rich).x, fieldOf(rich).y]).toEqual([14, 8]);
		},
	);

	it('keeps empty and zero-content boxes finite and preserves explicit outer dimensions', () => {
		const rich = new RichLabel();
		rich.outlineLayout = 'reserve-space';
		rich.stroke = 6;
		const group = mount(rich);
		expect(bounds(rich)).toEqual([0, 0, 0, 0, 0, 0]);
		rich.textFlow = [{ text: 'AB' }];
		rich.width = rich.height = 4;
		group.validateNow();
		expect(bounds(rich)).toEqual([4, 4, 14, 8, 0, 0]);
	});
});
