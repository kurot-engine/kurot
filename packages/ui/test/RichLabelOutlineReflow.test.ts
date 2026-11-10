import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rectangle, Stage, TextField } from '@kurot/core';
import { Group, Label, PropertyEvent, RichLabel, UIContext } from '../src/index.js';
import { mockTextMetrics } from './helpers/text-metrics.js';

mockTextMetrics();
const stages: Stage[] = [];
afterEach(() => {
	RichLabel.defaultOutlineLayout = 'render-only';
	for (const stage of stages.splice(0)) {
		stage.removeChildren();
	}
});

function mount(label: Label | RichLabel): { group: Group; settle: () => void } {
	label.size = 16;
	label.stroke = 1;
	label.wordWrap = false;
	label.left = label.right = 10;
	const group = new Group();
	group.addChild(label);
	const stage = new Stage();
	stages.push(stage);
	stage.addChild(group);
	const original = label.measure.bind(label);
	const measures = vi.spyOn(label, 'measure').mockImplementation(() => {
		if (measures.mock.calls.length > 20) {
			throw new Error('Outline reflow did not converge within 20 measurements');
		}
		original();
	});
	const layouts = vi.spyOn(label, 'updateDisplayList');
	return { group, settle: () => {
		measures.mockClear();
		layouts.mockClear();
		group.validateNow();
		const counts = [measures.mock.calls.length, layouts.mock.calls.length];
		for (let iteration = 0; iteration < 8; iteration++) {
			group.validateNow();
		}
		expect([measures.mock.calls.length, layouts.mock.calls.length]).toEqual(counts);
	} };
}

function snapshot(label: Label | RichLabel): number[] {
	const field = label.getChildAt(0);
	if (!(field instanceof TextField)) {
		throw new Error('Missing TextField');
	}
	const preferred = new Rectangle();
	label.getPreferredBounds(preferred);
	return [label.width, label.height, preferred.width, preferred.height, field.x, field.y, field.width, field.height];
}

describe('RichLabel outline reflow', () => {
	it.each([true, false])('matches Label through content, parent and min/max changes; multiline=%s', multiline => {
		const label = new Label();
		const rich = new RichLabel();
		rich.outlineLayout = 'reserve-space';
		label.multiline = rich.multiline = multiline;
		const a = mount(label);
		const b = mount(rich);
		const settle = (): void => {
			a.settle();
			b.settle();
			expect(snapshot(rich)).toEqual(snapshot(label));
			expect([b.group.width, b.group.height]).toEqual([a.group.width, a.group.height]);
		};
		for (const width of [NaN, 60, 140, 60, NaN]) {
			a.group.width = b.group.width = width;
			for (const text of ['Specialty', 'Skill', 'Specialty', 'AB\nCD']) {
				label.text = text;
				rich.textFlow = [{ text: text.slice(0, 2) }, { text: text.slice(2) }];
				settle();
			}
		}
		for (const limit of [60, 140, 60, 100000]) {
			a.group.maxWidth = b.group.maxWidth = limit;
			settle();
		}
		for (const component of [label, rich]) {
			component.left = component.right = NaN;
			component.minWidth = 80;
			component.minHeight = 40;
			component.maxWidth = 100;
		}
		settle();
		label.text = 'A'.repeat(30);
		rich.textFlow = [{ text: label.text }];
		settle();
		label.maxWidth = rich.maxWidth = 200;
		settle();
		label.invalidateSize();
		rich.invalidateSize();
		settle();
	});

	it('consumes outline changes once and keeps preferred width after narrower parent allocation', () => {
		const rich = new RichLabel([{ text: 'Specialty' }]);
		rich.outlineLayout = 'reserve-space';
		const { group, settle } = mount(rich);
		group.maxWidth = 60;
		settle();
		for (const stroke of [2, 6, 0, 1]) {
			rich.stroke = stroke;
			settle();
		}
		group.maxWidth = 200;
		settle();
		expect([rich.width, rich.height, group.width]).toEqual([80, 22, 100]);
		rich.outlineLayout = 'render-only';
		settle();
		expect([rich.width, rich.height, group.width]).toEqual([72, 16, 92]);
		rich.outlineLayout = 'reserve-space';
		settle();
		expect([rich.width, rich.height, group.width]).toEqual([80, 22, 100]);
	});

	it('notifies only changed policies and rejects invalid configuration atomically', () => {
		const rich = new RichLabel();
		const names: string[] = [];
		rich.addEventListener(PropertyEvent.PROPERTY_CHANGE, event => names.push(event.property));
		rich.outlineLayout = 'reserve-space';
		rich.outlineLayout = 'reserve-space';
		expect(names).toEqual(['outlineLayout']);
		expect(() => Reflect.set(rich, 'outlineLayout', 'automatic')).toThrow(RangeError);
		expect(rich.outlineLayout).toBe('reserve-space');
		expect(() => Reflect.set(RichLabel, 'defaultOutlineLayout', true)).toThrow(RangeError);
		expect(RichLabel.defaultOutlineLayout).toBe('render-only');
		const options = { skins: {}, assetAdapter: { getAsset() {} } };
		Reflect.set(options, 'richLabelOutlineLayout', 'invalid');
		expect(() => new UIContext(options).run(() => new RichLabel())).toThrow(RangeError);
	});
});
