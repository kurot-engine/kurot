// @vitest-environment happy-dom
/**
 * Label regression tests.
 *
 * Focuses on the Egret-parity fix for measure(): the text field's width must
 * not be left mutated after measuring. Egret saves the text field's width,
 * temporarily constrains it to measure wrapped dimensions, then restores it.
 * Before the fix, Kurot left the text field's $explicitWidth at the
 * measurement value (100000 when the label had no explicit width).
 *
 * Empty text isolates the width-restoration contract; a Canvas metric double
 * supplies the font frame used by blank rows.
 */
import { describe, it, expect } from 'vitest';
import { Label } from '../src/index.js';

import { mockTextMetrics } from './helpers/text-metrics.js';

mockTextMetrics();

describe('Label', () => {
	// Helper: reach the protected text field instance.
	function textField(label: Label): { $explicitWidth: number; width: number } {
		return (label as unknown as { _textField: { $explicitWidth: number; width: number } })._textField;
	}

	describe('measure() leaves no side effect on the text field width', () => {
		it('does not leave the text field width at 100000 when the label has no explicit width', () => {
			const label = new Label('');
			const tf = textField(label);

			// No explicit width on the label → text field starts unconstrained.
			expect(isNaN(tf.$explicitWidth)).toBe(true);

			label.measure();

			// Before the fix this leaked to 100000.
			expect(isNaN(tf.$explicitWidth)).toBe(true);
		});

		it('restores the text field width to its prior value after measuring', () => {
			const label = new Label('');
			label.width = 80; // sets the label's explicit width → measure uses 80
			const tf = textField(label);

			// Simulate a prior layout pass having sized the text field.
			tf.width = 50;
			expect(tf.$explicitWidth).toBe(50);

			label.measure();

			// measure() must restore the prior 50, not leave it at 80.
			expect(tf.$explicitWidth).toBe(50);
		});
	});

	describe('width constraint from layout', () => {
		it('setLayoutBoundsSize stores the layout width', () => {
			const label = new Label('');
			const h = label as unknown as { _widthConstraint: number };
			expect(isNaN(h._widthConstraint)).toBe(true);

			// Simulate the parent layout assigning a width.
			label.setLayoutBoundsSize(200, NaN);

			// The constraint should now be stored.
			expect(h._widthConstraint).toBe(200);
		});

		it('measure() retains the external width constraint across text changes', () => {
			const label = new Label('');
			const h = label as unknown as { _widthConstraint: number };
			const tf = textField(label);

			// Simulate a layout constraint of 200.
			h._widthConstraint = 200;

			label.measure();

			// The parent constraint remains authoritative for subsequent measurements.
			expect(h._widthConstraint).toBe(200);
			// And restored the text field width.
			expect(isNaN(tf.$explicitWidth)).toBe(true);
		});
	});
});
