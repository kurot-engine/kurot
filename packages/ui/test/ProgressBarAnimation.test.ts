import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Stage, ticker } from '@kurot/core';
import { Label, ProgressBar, Rect } from '../src/index.js';

let now = Date.now();
let stage: Stage;

function advance(milliseconds: number): void {
	now += milliseconds;
	ticker.update(true);
}

function createProgress(): { bar: ProgressBar; label: Label; thumb: Rect } {
	const bar = new ProgressBar();
	const label = new Label();
	const thumb = new Rect(200, 10, 0x00ff00);
	bar.labelDisplay = label;
	bar.thumb = thumb;
	stage.addChild(bar);
	return { bar, label, thumb };
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

describe('ProgressBar animated values', () => {
	it('keeps the displayed value and ratio inside a reduced range', () => {
		const { bar, label } = createProgress();
		bar.slideDuration = 0;
		bar.maximum = 2000;
		bar.value = 1600;
		bar.slideDuration = 500;
		bar.maximum = 266;
		bar.value = 120;

		advance(123);
		bar.updateDisplayList(200, 10);

		const displayed = Number(label.text.split(' / ')[0]);
		expect(displayed).toBeGreaterThanOrEqual(0);
		expect(displayed).toBeLessThanOrEqual(266);
		expect(bar.ratio).toBeGreaterThanOrEqual(0);
		expect(bar.ratio).toBeLessThanOrEqual(1);
	});

	it('formats intermediate integer progress without fractional noise', () => {
		const { bar, label } = createProgress();
		bar.value = 100;
		advance(123);
		bar.updateDisplayList(200, 10);

		expect(Number.isInteger(bar.value)).toBe(false);
		expect(label.text).toBe('14 / 100');
	});

	it.each([
		{ property: 'minimum', boundary: 60, expected: 100 },
		{ property: 'maximum', boundary: 50, expected: 50 },
	] as const)('reclamps an active animation when $property changes', ({ property, boundary, expected }) => {
		const { bar, label, thumb } = createProgress();
		bar.value = 100;
		advance(123);
		bar[property] = boundary;

		for (const milliseconds of [0, 50, 100, 500]) {
			advance(milliseconds);
			bar.updateDisplayList(200, 10);
			expect(bar.value).toBeGreaterThanOrEqual(bar.minimum);
			expect(bar.value).toBeLessThanOrEqual(bar.maximum);
			expect(bar.ratio).toBeGreaterThanOrEqual(0);
			expect(bar.ratio).toBeLessThanOrEqual(1);
			expect(Number(label.text.split(' / ')[0])).toBeGreaterThanOrEqual(bar.minimum);
			expect(Number(label.text.split(' / ')[0])).toBeLessThanOrEqual(bar.maximum);
			expect(thumb.scrollRect?.width).toBeLessThanOrEqual(200);
		}
		expect(bar.value).toBe(expected);
	});

	it('keeps the current position when an active range expands', () => {
		const { bar } = createProgress();
		bar.value = 100;
		advance(123);
		const before = bar.value;
		bar.minimum = -100;
		expect(bar.value).toBe(before);
		advance(123);
		expect(bar.value).toBeGreaterThan(before);
		expect(bar.value).toBeLessThan(100);
		advance(500);
		expect(bar.value).toBe(100);
	});

	it('retargets rapid assignments from the current display and reaches the latest target', () => {
		const { bar } = createProgress();
		bar.value = 100;
		advance(100);
		const first = bar.value;
		bar.value = 20;
		expect(bar.value).toBe(first);
		advance(30);
		const second = bar.value;
		bar.value = 80;
		expect(bar.value).toBe(second);
		advance(500);
		expect(bar.value).toBe(80);
		expect(bar.ratio).toBe(0.8);
	});

	it('cancels a pending target when assigned the currently displayed value', () => {
		const { bar } = createProgress();
		bar.value = 100;
		bar.value = 0;
		advance(500);
		expect(bar.value).toBe(0);
		expect(bar.ratio).toBe(0);
	});

	it('does not restart the animation when its requested target is assigned again', () => {
		const { bar } = createProgress();
		bar.value = 100;
		advance(123);
		bar.value = 100;
		advance(377);
		expect(bar.value).toBe(100);
	});

	it('finishes a decreasing fractional animation at the exact requested value', () => {
		const { bar, label } = createProgress();
		bar.slideDuration = 0;
		bar.maximum = 1;
		bar.value = 0.9;
		bar.slideDuration = 500;
		bar.value = 0.1;
		advance(500);
		bar.updateDisplayList(200, 10);
		expect(bar.value).toBe(0.1);
		expect(bar.ratio).toBe(0.1);
		expect(label.text).toBe('0.1 / 1');
	});

	it.each([0, 50])('settles immediately when the range collapses to %s', boundary => {
		const { bar, label } = createProgress();
		bar.value = 100;
		advance(123);
		bar.minimum = boundary;
		bar.maximum = boundary;
		bar.value = 100;
		bar.updateDisplayList(200, 10);
		expect(bar.value).toBe(boundary);
		expect(bar.ratio).toBe(0);
		expect(label.text).toBe(`${boundary} / ${boundary}`);
		advance(1000);
		expect(bar.value).toBe(boundary);
	});

	it.each([0, 250])('settles the pending target when slideDuration changes to %s', duration => {
		const { bar } = createProgress();
		bar.value = 100;
		advance(123);
		bar.slideDuration = duration;
		expect(bar.value).toBe(100);
		bar.value = 30;
		advance(500);
		expect(bar.value).toBe(30);
	});

	it('stops an old animation before applying an offstage assignment', () => {
		const { bar } = createProgress();
		bar.value = 100;
		advance(123);
		stage.removeChild(bar);
		bar.value = 45;
		expect(bar.value).toBe(45);
		advance(500);
		expect(bar.value).toBe(45);
	});
});
