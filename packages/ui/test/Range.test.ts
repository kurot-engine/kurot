import { describe, it, expect } from 'vitest';
import { Range } from '../src/blakron/components/Range.js';

/**
 * Test-only subclass exposing the protected nearestValidValue and setValue
 * so we can unit-test the snap/clamp math without a stage or skin.
 */
class TestRange extends Range {
	public nearest(value: number, interval: number): number {
		return this.nearestValidValue(value, interval);
	}
	public applyValue(value: number): void {
		this.setValue(value);
	}
	public get rawValue(): number {
		// read the committed value directly (bypass the pending-state getter)
		return (this as unknown as { _value: number })._value;
	}
}

describe('Range', () => {
	describe('value clamping', () => {
		it('clamps value to [minimum, maximum] via setValue', () => {
			const r = new TestRange();
			r.minimum = 0;
			r.maximum = 100;

			r.applyValue(50);
			expect(r.rawValue).toBe(50);

			r.applyValue(-10);
			expect(r.rawValue).toBe(0);

			r.applyValue(200);
			expect(r.rawValue).toBe(100);
		});

		it('does not clamp when maximum <= minimum', () => {
			const r = new TestRange();
			r.minimum = 50;
			r.maximum = 50;

			r.applyValue(30);
			// When max <= min, setValue passes the value through unchanged.
			expect(r.rawValue).toBe(30);
		});
	});

	describe('nearestValidValue (snap to interval)', () => {
		it('clamps to the range even with a snap interval', () => {
			const r = new TestRange();
			r.minimum = 0;
			r.maximum = 10;

			expect(r.nearest(-5, 1)).toBe(0);
			expect(r.nearest(99, 1)).toBe(10);
		});

		it('snaps to the nearest integer multiple of the interval', () => {
			const r = new TestRange();
			r.minimum = 0;
			r.maximum = 100;

			// interval = 10: 25 rounds to 30, 24 rounds to 20
			expect(r.nearest(25, 10)).toBe(30);
			expect(r.nearest(24, 10)).toBe(20);
			expect(r.nearest(5, 10)).toBe(10);
		});

		it('with interval 0, just clamps without snapping', () => {
			const r = new TestRange();
			r.minimum = 0;
			r.maximum = 100;

			expect(r.nearest(37, 0)).toBe(37);
			expect(r.nearest(-1, 0)).toBe(0);
			expect(r.nearest(150, 0)).toBe(100);
		});

		it('handles a non-zero minimum offset', () => {
			const r = new TestRange();
			r.minimum = 10;
			r.maximum = 20;

			// value is measured relative to minimum; interval 2
			// 11 -> offset 1, midpoint between 0 and 2, rounds up to 2 -> 12
			expect(r.nearest(11, 2)).toBe(12);
			expect(r.nearest(13, 2)).toBe(14);
			expect(r.nearest(19, 2)).toBe(20);
		});

		it('snaps to fractional intervals (scale path)', () => {
			const r = new TestRange();
			r.minimum = 0;
			r.maximum = 1;

			// interval 0.25: 0.3 is closer to 0.25 than 0.5
			expect(r.nearest(0.3, 0.25)).toBeCloseTo(0.25, 10);
			expect(r.nearest(0.4, 0.25)).toBeCloseTo(0.5, 10);
			expect(r.nearest(0.1, 0.25)).toBeCloseTo(0, 10);
		});
	});
});
