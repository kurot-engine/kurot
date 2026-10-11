import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Group, HorizontalLayout, Label } from '../src/index.js';

class InspectableLabel extends Label {
	public get textRegion(): number[] {
		return [this._textField.x, this._textField.y, this._textField.width, this._textField.height];
	}

	public get lineStarts(): number[] {
		const field = this._textField;
		return field.getLinesArr().map(line => {
			const remaining = field.width - line.width;
			return field.x + (this.textAlign === 'right' ? remaining : this.textAlign === 'center' ? remaining / 2 : 0);
		});
	}
}

const context = { font: '', measureText: vi.fn() };

function validate(label: Label): void {
	label.validateProperties();
	label.validateSize();
	label.validateDisplayList();
}

describe('Label fitting alignment', () => {
	beforeEach(() => {
		context.measureText.mockReset().mockImplementation((text: string) => {
			const size = Number(/([\d.]+)px/.exec(context.font)?.[1] ?? 30);
			return { width: (text.length * size) / 2 };
		});
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
			context as unknown as CanvasRenderingContext2D,
		);
	});

	afterEach(() => vi.restoreAllMocks());

	it.each(['left', 'center', 'right'])('keeps the original %s line origin when toggling fitting', alignment => {
		const label = new InspectableLabel('BET');
		label.size = 20;
		label.width = 120;
		label.height = 60;
		label.stroke = 1;
		label.multiline = false;
		label.textAlign = alignment;
		validate(label);
		const original = label.lineStarts;
		label.textFit = 'shrink';
		validate(label);
		expect(label.renderedSize).toBe(20);
		expect(label.lineStarts).toEqual(original);
		expect(label.textRegion.slice(1)).toEqual([4, 112, 52]);
		label.textFit = 'none';
		validate(label);
		expect(label.lineStarts).toEqual(original);
		expect(label.textRegion).toEqual([4, 4, 112, 52]);
	});

	it.each(['top', 'middle', 'bottom'])('preserves the inset content height for %s alignment', alignment => {
		const label = new InspectableLabel('A\nB');
		label.size = 20;
		label.width = 120;
		label.height = 60;
		label.stroke = 2;
		label.verticalAlign = alignment;
		validate(label);
		label.textFit = 'shrink';
		validate(label);
		expect(label.renderedSize).toBe(20);
		expect(label.textRegion).toEqual([6, 6, 108, 48]);
	});

	it.each(['automatic', 'width', 'height', 'maximums'])(
		'keeps outline-safe automatic dimensions with %s bounds',
		bounds => {
			const label = new InspectableLabel('BET');
			label.size = 20;
			label.stroke = 2;
			if (bounds === 'width') {
				label.width = 120;
			}
			if (bounds === 'height') {
				label.height = 60;
			}
			if (bounds === 'maximums') {
				label.maxWidth = 120;
				label.maxHeight = 60;
			}
			validate(label);
			const original = [label.width, label.height];
			label.textFit = 'shrink';
			for (let pass = 0; pass < 8; pass++) {
				validate(label);
			}
			expect([label.width, label.height, label.renderedSize]).toEqual([...original, 20]);
			expect(label.textRegion[0]).toBe(6);
			expect(label.textRegion[1]).toBe(6);
		},
	);

	it('repositions only the internal wrap region after alignment and outline changes', () => {
		const label = new InspectableLabel('BET');
		label.size = 20;
		label.width = 120;
		label.stroke = 1;
		label.textFit = 'shrink';
		validate(label);
		expect(label.lineStarts).toEqual([4]);
		label.textAlign = 'right';
		validate(label);
		expect(label.lineStarts).toEqual([86]);
		label.stroke = 3;
		validate(label);
		expect(label.lineStarts).toEqual([82]);
		label.textAlign = 'center';
		validate(label);
		expect(label.lineStarts).toEqual([45]);
	});

	it('does not change a centered icon-and-caption row with an automatic height', () => {
		const row = new Group();
		row.layout = new HorizontalLayout();
		const icon = new Group();
		icon.width = icon.height = 32;
		const label = new InspectableLabel('BET');
		label.width = label.maxWidth = 120;
		label.size = 20;
		label.stroke = 1;
		label.multiline = false;
		row.addChild(icon);
		row.addChild(label);
		row.validateNow();
		const original = [row.width, row.height, label.x, label.y, label.width, label.height, ...label.lineStarts];
		label.textFit = 'shrink';
		row.validateNow();
		expect([row.width, row.height, label.x, label.y, label.width, label.height, ...label.lineStarts]).toEqual(
			original,
		);
	});
});
