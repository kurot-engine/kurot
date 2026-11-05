import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasRenderer, TextField } from '@kurot/core';
import { Component, PropertyEvent, RichLabel, SetProperty, Skin } from '../src/index.js';

function field(label: RichLabel): TextField {
	label.createChildren();
	const child = label.getChildAt(0);
	if (!(child instanceof TextField)) {
		throw new Error('Expected the native text field.');
	}
	return child;
}

describe('RichLabel typography', () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			font: '',
			measureText(this: { font: string }, text: string) {
				const size = Number(this.font.match(/([\d.]+)px/)?.[1] ?? 30);
				return { width: (text.length * size) / 2 };
			},
		} as unknown as CanvasRenderingContext2D);
	});

	afterEach(() => vi.restoreAllMocks());

	it('exposes the native defaults without changing the original runs', () => {
		const label = new RichLabel([{ text: 'default' }]);
		const native = field(label);
		expect(label.fontFamily).toBe(native.fontFamily);
		expect(label.size).toBe(native.size);
		expect(label.textColor).toBe(native.textColor);
		expect(label.stroke).toBe(0);
		expect(label.strokeColor).toBe(0);
		expect(label.bold).toBe(false);
		expect(label.italic).toBe(false);
		expect(label.textFlow).toEqual([{ text: 'default' }]);
		expect(label.wordWrap).toBe(true);
		expect(label).not.toHaveProperty('text');
		expect(label).not.toHaveProperty('textFit');
		expect(label).not.toHaveProperty('textStyle');
	});

	it('renders inherited appearance and explicit false/zero overrides without merging the flow', () => {
		const label = new RichLabel();
		label.fontFamily = 'base-family';
		label.size = 18;
		label.bold = true;
		label.italic = true;
		label.textColor = 0xffffff;
		label.stroke = 2;
		label.strokeColor = 0x123456;
		const flow = [
			{ text: 'A' },
			{
				text: 'B',
				style: {
					fontFamily: 'local-family',
					size: 24,
					bold: false,
					italic: false,
					textColor: 0,
					stroke: 0,
					strokeColor: 0,
				},
			},
		];
		label.textFlow = flow;
		const painted: { text: string; font: string; color: unknown }[] = [];
		const outlined: string[] = [];
		const context = {
			save() {},
			restore() {},
			translate() {},
			beginPath() {},
			rect() {},
			clip() {},
			fillRect() {},
			font: '',
			fillStyle: '',
			textBaseline: 'alphabetic',
			fillText(this: { font: string; fillStyle: unknown }, text: string): void {
				painted.push({ text, font: this.font, color: this.fillStyle });
			},
			strokeText(text: string): void {
				outlined.push(text);
			},
		} as unknown as CanvasRenderingContext2D;
		new CanvasRenderer().renderTextFieldToContext(field(label), context, 0, 0);
		expect(painted[0]?.font).toContain('italic bold 18px base-family');
		expect(painted[1]).toEqual({ text: 'B', font: '24px local-family', color: 'rgb(0,0,0)' });
		expect(outlined).toEqual(['A']);
		expect(label.textFlow).toEqual(flow);
		label.size = 36;
		expect(label.textFlow).toEqual(flow);
		expect(label.textHeight).toBe(36);
	});

	it.each([true, false])(
		'accepts either assignment order and retains typography after content clearing: %s',
		styleFirst => {
			const label = new RichLabel();
			if (styleFirst) {
				label.size = 18;
			}
			label.textFlow = [{ text: 'AB' }];
			if (!styleFirst) {
				label.size = 18;
			}
			expect(label.textHeight).toBe(18);
			label.textFlow = [];
			expect([label.textWidth, label.textHeight]).toEqual([0, 0]);
			label.textFlow = [{ text: 'CD' }];
			expect(label.textHeight).toBe(18);
			label.size = 24;
			label.textFlow = [{ text: 'fixed', style: { size: 18 } }, { text: ' follows' }];
			expect(label.textFlow[0]?.style?.size).toBe(18);
			expect(label.textHeight).toBe(24);
		},
	);

	it('refreshes wrapping, automatic height and cached measurements after typography changes', () => {
		const label = new RichLabel([{ text: 'abcdef' }]);
		const measured = vi.spyOn(field(label), 'measureText');
		label.width = 40;
		label.size = 10;
		label.validateNow();
		expect(label.height).toBe(10);
		const calls = measured.mock.calls.length;
		label.textColor = 0;
		label.strokeColor = 0xff0000;
		label.textHeight;
		expect(measured).toHaveBeenCalledTimes(calls);
		label.size = 20;
		label.validateNow();
		expect(label.height).toBe(40);
		for (const change of [
			() => {
				label.fontFamily = 'other-family';
			},
			() => {
				label.bold = true;
			},
			() => {
				label.italic = true;
			},
		]) {
			const before = measured.mock.calls.length;
			change();
			label.textHeight;
			expect(measured.mock.calls.length).toBeGreaterThan(before);
		}
	});

	it('publishes only the changed property after installing its new value', () => {
		const label = new RichLabel([{ text: 'retained' }]);
		const events: string[] = [];
		label.addEventListener(PropertyEvent.PROPERTY_CHANGE, event => events.push(event.property));
		label.size = 18;
		label.size = 18;
		label.fontFamily = 'family';
		label.bold = true;
		label.italic = true;
		label.textColor = 0;
		label.stroke = 1;
		label.strokeColor = 1;
		expect(events).toEqual(['size', 'fontFamily', 'bold', 'italic', 'textColor', 'stroke', 'strokeColor']);
		expect(label.textFlow).toEqual([{ text: 'retained' }]);
	});

	it('restores per-property state values while preserving content edits and local overrides', () => {
		const label = new RichLabel([{ text: 'fixed', style: { size: 18 } }]);
		label.size = 18;
		label.stroke = 1;
		const skin = new Skin();
		skin.setPart('rich', label);
		const host = new Component();
		const override = new SetProperty('rich', 'size', 32);
		override.apply(host, skin);
		label.textFlow = [{ text: 'new' }, { text: 'fixed', style: { size: 18 } }];
		expect(label.textHeight).toBe(32);
		expect(label.stroke).toBe(1);
		override.remove(host, skin);
		expect(label.textHeight).toBe(18);
		expect(label.textFlow).toEqual([{ text: 'new' }, { text: 'fixed', style: { size: 18 } }]);
	});

	it('uses component values for explicit undefined run fields while retaining the original snapshot', () => {
		const flow = [{ text: 'follows', style: { size: undefined, bold: undefined, stroke: undefined } }];
		const label = new RichLabel(flow);
		label.size = 18;
		label.bold = true;
		label.stroke = 1;
		expect(label.textHeight).toBe(18);
		expect(label.textFlow).toEqual(flow);
		label.size = 24;
		expect(label.textHeight).toBe(24);
		expect(label.textFlow).toEqual(flow);
	});

	it.each([
		['size', -1],
		['size', NaN],
		['size', Infinity],
		['stroke', -1],
		['textColor', -1],
		['textColor', 0x1000000],
		['strokeColor', 1.5],
	] as const)('rejects invalid %s atomically', (property, value) => {
		const label = new RichLabel([{ text: 'retained' }]);
		const previous = label[property];
		expect(() => {
			label[property] = value;
		}).toThrow(RangeError);
		expect(label[property]).toBe(previous);
		expect(label.textFlow).toEqual([{ text: 'retained' }]);
	});

	it('rejects malformed family and emphasis values without coercion', () => {
		const label = new RichLabel();
		const family = label.fontFamily;
		expect(() => {
			label.fontFamily = 100 as unknown as string;
		}).toThrow(TypeError);
		expect(() => {
			label.bold = 'true' as unknown as boolean;
		}).toThrow(TypeError);
		expect(() => {
			label.italic = 1 as unknown as boolean;
		}).toThrow(TypeError);
		expect([label.fontFamily, label.bold, label.italic]).toEqual([family, false, false]);
	});
});
