import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stage, ticker } from '@kurot/core';
import { Label, ProgressBar } from '../src/index.js';

let now = Date.now();
let stage: Stage;

function advance(milliseconds: number): void {
	now += milliseconds;
	ticker.update(true);
}

function createProgress(): { bar: ProgressBar; label: Label } {
	const bar = new ProgressBar();
	const label = new Label();
	bar.labelDisplay = label;
	stage.addChild(bar);
	return { bar, label };
}

beforeEach(() => {
	vi.spyOn(Date, 'now').mockImplementation(() => now);
	stage = new Stage();
});

afterEach(() => {
	advance(60_000);
	stage.removeChildren();
	vi.restoreAllMocks();
});

describe('ProgressBar label precision', () => {
	it('retains fractional progress while formatting only its default text', () => {
		const { bar, label } = createProgress();
		bar.slideDuration = 0;
		bar.maximum = 1;
		bar.value = 0.9;
		bar.slideDuration = 500;
		bar.value = 0.1;
		advance(200);
		bar.updateDisplayList(200, 10);
		expect(bar.value).toBeCloseTo(0.5);
		expect(bar.ratio).toBeCloseTo(0.5);
		expect(label.text).toBe('0.5 / 1');
		advance(300);
		bar.updateDisplayList(200, 10);
		expect(bar.value).toBe(0.1);
		expect(label.text).toBe('0.1 / 1');
	});

	it('includes the precision of the starting value when the new target is an integer', () => {
		const { bar, label } = createProgress();
		bar.slideDuration = 0;
		bar.maximum = 1;
		bar.value = 0.125;
		bar.slideDuration = 500;
		bar.value = 1;
		bar.updateDisplayList(200, 10);
		expect(label.text).toBe('0.125 / 1');
		advance(100);
		bar.updateDisplayList(200, 10);
		expect(label.text).toMatch(/^0\.\d{1,3} \/ 1$/);
		advance(500);
		bar.updateDisplayList(200, 10);
		expect(label.text).toBe('1 / 1');
	});

	it('uses fractional range precision without rounding the numeric state', () => {
		const { bar, label } = createProgress();
		bar.slideDuration = 0;
		bar.minimum = 0.25;
		bar.maximum = 2.75;
		bar.slideDuration = 500;
		bar.value = 2;
		advance(175);
		bar.updateDisplayList(200, 10);
		expect(bar.value).toBeCloseTo(1.125);
		expect(bar.ratio).toBeCloseTo(0.35);
		expect(label.text).toBe('1.13 / 2.75');
	});

	it('does not infer label precision from an interrupted interpolation', () => {
		const { bar, label } = createProgress();
		bar.value = 100;
		advance(123);
		bar.value = 50;
		advance(30);
		bar.updateDisplayList(200, 10);
		expect(Number.isInteger(bar.value)).toBe(false);
		expect(label.text).toMatch(/^\d+ \/ 100$/);
	});

	it('passes the unrounded display and maximum to a custom labelFunction', () => {
		const { bar, label } = createProgress();
		const values: Array<{ value: number; maximum: number }> = [];
		bar.labelFunction = (value, maximum) => {
			values.push({ value, maximum });
			return `${value} units`;
		};
		bar.value = 100;
		advance(123);
		bar.updateDisplayList(200, 10);
		expect(values.at(-1)).toEqual({ value: bar.value, maximum: 100 });
		expect(Number.isInteger(bar.value)).toBe(false);
		expect(label.text).toBe(`${bar.value} units`);
		bar.labelFunction = undefined;
		bar.updateDisplayList(200, 10);
		expect(label.text).toBe('14 / 100');
	});

	it('preserves full precision for an overridden label method', () => {
		class CustomProgress extends ProgressBar {
			protected override _valueToLabel(value: number, maximum: number): string {
				return `${value.toFixed(6)} / ${maximum}`;
			}
		}
		const bar = new CustomProgress();
		const label = new Label();
		bar.labelDisplay = label;
		stage.addChild(bar);
		bar.value = 100;
		advance(123);
		bar.updateDisplayList(200, 10);
		expect(label.text).toBe('14.203176 / 100');
	});

	it('retains small fractional values written in exponent notation', () => {
		const { bar, label } = createProgress();
		bar.slideDuration = 0;
		bar.maximum = 1e-6;
		bar.value = 2e-7;
		bar.slideDuration = 500;
		bar.value = 1e-7;
		advance(25);
		bar.updateDisplayList(200, 10);
		expect(bar.value).toBeGreaterThan(1e-7);
		expect(bar.value).toBeLessThan(2e-7);
		expect(label.text).toMatch(/^[12]e-7 \/ 0\.000001$/);
		advance(500);
		bar.updateDisplayList(200, 10);
		expect(bar.value).toBe(1e-7);
		expect(label.text).toBe('1e-7 / 0.000001');
	});

	it('keeps tiny progress beyond fixed decimal formatting limits', () => {
		const { bar, label } = createProgress();
		bar.slideDuration = 0;
		bar.maximum = 1e-119;
		bar.value = 2e-120;
		bar.slideDuration = 500;
		bar.value = 1e-120;
		advance(25);
		bar.updateDisplayList(200, 10);
		expect(Number(label.text.split(' / ')[0])).toBeGreaterThan(0);
		advance(500);
		bar.updateDisplayList(200, 10);
		expect(bar.value).toBe(1e-120);
		expect(label.text).toBe('1e-120 / 1e-119');
	});
});

describe('ProgressBar event compatibility', () => {
	it('keeps animations, range changes and duration changes silent', () => {
		const { bar } = createProgress();
		const changes = vi.fn();
		const properties = vi.fn();
		bar.addEventListener('change', changes);
		bar.addEventListener('propertyChange', properties);
		bar.value = 100;
		advance(123);
		bar.maximum = 80;
		bar.minimum = 20;
		bar.value = 60;
		advance(500);
		bar.value = 40;
		bar.slideDuration = 0;
		expect(bar.value).toBe(40);
		expect(changes).not.toHaveBeenCalled();
		expect(properties).not.toHaveBeenCalled();
	});

	it('dispatches one change per distinct immediate assignment', () => {
		const { bar } = createProgress();
		bar.slideDuration = 0;
		const values: number[] = [];
		bar.addEventListener('change', () => values.push(bar.value));
		bar.value = 30;
		bar.value = 30;
		bar.value = 60;
		bar.maximum = 50;
		expect(values).toEqual([30, 60]);
		expect(bar.value).toBe(50);
	});

	it('keeps offstage assignments immediate and emits their existing change event', () => {
		const bar = new ProgressBar();
		const changes = vi.fn();
		bar.addEventListener('change', changes);
		bar.value = 0.125;
		bar.value = 0.125;
		expect(bar.value).toBe(0.125);
		expect(changes).toHaveBeenCalledTimes(1);
	});

	it('settles a repeated target immediately after removal and emits one change', () => {
		const { bar } = createProgress();
		const changes = vi.fn();
		bar.addEventListener('change', changes);
		bar.value = 100;
		advance(123);
		stage.removeChild(bar);
		bar.value = 100;
		expect(bar.value).toBe(100);
		expect(changes).toHaveBeenCalledTimes(1);
		advance(500);
		expect(bar.value).toBe(100);
		expect(changes).toHaveBeenCalledTimes(1);
	});

	it('does not emit a change when an offstage assignment keeps the displayed value', () => {
		const { bar } = createProgress();
		const changes = vi.fn();
		bar.addEventListener('change', changes);
		bar.value = 100;
		advance(123);
		const displayed = bar.value;
		stage.removeChild(bar);
		bar.value = displayed;
		advance(500);
		expect(bar.value).toBe(displayed);
		expect(changes).not.toHaveBeenCalled();
	});
});
