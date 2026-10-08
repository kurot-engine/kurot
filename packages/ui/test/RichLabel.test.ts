import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasRenderer, Stage, TextField } from '@kurot/core';
import type { ITextElement } from '@kurot/core';
import { Component, Group, Label, PropertyEvent, RichLabel } from '../src/index.js';

function getField(label: RichLabel): TextField {
	label.createChildren();
	const field = label.getChildAt(0);
	if (!(field instanceof TextField)) throw new Error('Expected one native TextField.');
	return field;
}

describe('RichLabel', () => {
	beforeEach(() => {
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			font: '',
			measureText: (text: string) => ({ width: text.length * 10 }),
		} as unknown as CanvasRenderingContext2D);
	});

	afterEach(() => vi.restoreAllMocks());

	it('is an independent component with one TextField and no Label content API', () => {
		const label = new RichLabel([{ text: 'abc' }]);
		const field = getField(label);

		expect(label).toBeInstanceOf(Component);
		expect(label).not.toBeInstanceOf(Label);
		expect(
			['text', 'textColor', 'size', 'fontFamily', 'bold', 'italic', 'textStyle', 'textFit'].some(
				name => name in label,
			),
		).toBe(false);
		expect(label.numChildren).toBe(1);
		expect(label.touchChildren).toBe(false);
		expect(field.text).toBe('abc');
		expect(label.multiline).toBe(true);
		expect(label.wordWrap).toBe(true);
	});

	it('owns snapshots and clears all content with an empty flow', () => {
		const flow: ITextElement[] = [{ text: 'original', style: { bold: true, textColor: 0xff0000 } }];
		const label = new RichLabel(flow);
		flow[0].text = 'outside';
		flow[0].style!.bold = false;
		const snapshot = label.textFlow;
		snapshot[0].text = 'read';
		snapshot[0].style!.textColor = 0;

		expect(label.textFlow).toEqual([{ text: 'original', style: { bold: true, textColor: 0xff0000 } }]);
		label.textFlow = [];
		expect([label.textWidth, label.textHeight]).toEqual([0, 0]);
	});

	it('publishes the complete new flow to binding listeners', () => {
		const label = new RichLabel();
		const observed: ITextElement[][] = [];
		label.addEventListener(PropertyEvent.PROPERTY_CHANGE, () => observed.push(label.textFlow));
		label.textFlow = [{ text: 'A', style: { bold: true } }, { text: 'B' }];

		expect(observed).toEqual([[{ text: 'A', style: { bold: true } }, { text: 'B' }]]);
	});

	it('wraps continuous words across styles using maxWidth and grows automatic height', () => {
		const label = new RichLabel([
			{ text: 'ab', style: { size: 18, bold: true } },
			{ text: 'cd', style: { size: 18, textColor: 0xff0000 } },
			{ text: 'ef', style: { size: 18, italic: true } },
		]);
		label.maxWidth = 30;
		label.measure();

		expect([label.textWidth, label.textHeight]).toEqual([30, 36]);
		label.validateNow();
		expect([label.width, label.height]).toEqual([30, 36]);
		label.maxWidth = 60;
		label.validateNow();
		expect([label.width, label.height]).toEqual([60, 18]);
	});

	it('follows parent width changes without changing rendered field constraints while measuring', () => {
		const label = new RichLabel([{ text: 'abcdef', style: { size: 18 } }]);
		const field = getField(label);
		field.width = 80;
		field.height = 10;
		label.setLayoutBoundsSize(30, NaN);
		label.measure();

		expect(label.textHeight).toBe(36);
		expect([field.$explicitWidth, field.$explicitHeight]).toEqual([80, 10]);
		label.setLayoutBoundsSize(60, NaN);
		expect(label.textHeight).toBe(18);
	});

	it('honors explicit width, hard breaks, spacing and single-line mode', () => {
		const label = new RichLabel([{ text: 'abcd\nef', style: { size: 18 } }]);
		label.wordWrap = false;
		label.width = 20;
		label.height = 10;
		label.lineSpacing = 2;

		expect([label.textWidth, label.textHeight]).toEqual([20, 58]);
		label.multiline = false;
		expect([label.textWidth, label.textHeight]).toEqual([40, 18]);
	});

	it('remeasures automatic height when authored width changes after validation', () => {
		const label = new RichLabel([{ text: 'abcdef', style: { size: 18 } }]);
		label.width = 30;
		label.validateNow();
		expect(label.height).toBe(36);
		label.width = 60;
		label.validateNow();
		expect([label.width, label.height]).toEqual([60, 18]);
	});

	it('tracks a real parent layout with edge constraints and automatic height', () => {
		const stage = new Stage();
		const group = new Group();
		group.width = 40;
		const label = new RichLabel([{ text: 'abcdef', style: { size: 18 } }]);
		label.left = 5;
		label.right = 5;
		group.addChild(label);
		stage.addChild(group);
		try {
			group.validateNow();
			expect([label.x, label.width, label.height]).toEqual([5, 30, 36]);
			group.width = 70;
			group.validateNow();
			expect([label.width, label.height]).toEqual([60, 18]);
		} finally {
			stage.removeChild(group);
		}
	});

	it('supports alignment, invalidates late font metrics and preserves the authored runs', () => {
		const flow: ITextElement[] = [{ text: 'A', style: { size: 18, fontFamily: 'project-font' } }];
		const label = new RichLabel(flow);
		const field = getField(label);
		const invalidated = vi.spyOn(field, 'invalidateTextMetrics');
		label.textAlign = 'right';
		label.verticalAlign = 'bottom';
		label.updateDisplayList(100, 80);
		label.invalidateSize();

		expect([field.textAlign, field.verticalAlign]).toEqual(['right', 'bottom']);
		expect([field.width, field.height]).toEqual([100, 80]);
		expect(invalidated).toHaveBeenCalled();
		expect(label.textFlow).toEqual(flow);
	});

	it('reuses unchanged content metrics and refreshes them after edits or font readiness', () => {
		const label = new RichLabel([{ text: 'abcdef', style: { size: 18 } }]);
		const measured = vi.spyOn(getField(label), 'measureText');
		label.width = 40;
		label.textWidth;
		label.textHeight;
		label.measure();
		expect(measured).toHaveBeenCalledOnce();

		label.invalidateSize();
		label.textWidth;
		expect(measured).toHaveBeenCalledTimes(2);
		label.textFlow = [{ text: 'ab', style: { size: 18 } }];
		expect(label.textWidth).toBe(20);
		expect(measured).toHaveBeenCalledTimes(3);
	});

	it('renders local bold, italic and color through the native Canvas renderer', () => {
		const label = new RichLabel([
			{ text: 'Bold', style: { size: 18, bold: true, textColor: 0xff0000 } },
			{ text: 'Italic', style: { size: 18, italic: true, textColor: 0x00ff00 } },
		]);
		const field = getField(label);
		const painted: Array<{ text: string; font: string; color: unknown }> = [];
		const context = {
			save: vi.fn(),
			restore: vi.fn(),
			translate: vi.fn(),
			beginPath: vi.fn(),
			rect: vi.fn(),
			clip: vi.fn(),
			fillRect: vi.fn(),
			strokeText: vi.fn(),
			font: '',
			fillStyle: '',
			textBaseline: 'alphabetic',
			measureText: (text: string) => ({ width: text.length * 10 }),
			fillText(this: { font: string; fillStyle: string }, text: string): void {
				painted.push({ text, font: this.font, color: this.fillStyle });
			},
		} as unknown as CanvasRenderingContext2D;

		new CanvasRenderer().renderTextFieldToContext(field, context, 0, 0);
		expect(painted[0]).toMatchObject({ text: 'Bold', color: 'rgb(255,0,0)' });
		expect(painted[0].font).toContain('bold');
		expect(painted[1]).toMatchObject({ text: 'Italic', color: 'rgb(0,255,0)' });
		expect(painted[1].font).toContain('italic');
	});

	it('rejects malformed content atomically and invalid spacing', () => {
		const label = new RichLabel([{ text: 'retained' }]);
		expect(() => {
			label.textFlow = [{ text: 123 as unknown as string }];
		}).toThrow(TypeError);
		expect(label.textFlow).toEqual([{ text: 'retained' }]);
		expect(() => {
			label.lineSpacing = -1;
		}).toThrow(RangeError);
	});
});
