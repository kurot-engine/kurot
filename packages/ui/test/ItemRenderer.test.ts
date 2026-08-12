/**
 * ItemRenderer regression tests.
 *
 * Verifies the state machine (up/down/disabled/upAndSelected/downAndSelected),
 * the skin.hasState fallback, and data/selected property behavior.
 */
import { describe, it, expect } from 'vitest';
import { ItemRenderer, Component } from '../src/index.js';

describe('ItemRenderer', () => {
	describe('getCurrentState', () => {
		it('returns "up" by default', () => {
			const ir = new ItemRenderer();
			expect((ir as unknown as { getCurrentState: () => string }).getCurrentState()).toBe('up');
		});

		it('returns "disabled" when not enabled', () => {
			const ir = new ItemRenderer();
			ir.enabled = false;
			expect((ir as unknown as { getCurrentState: () => string }).getCurrentState()).toBe('disabled');
		});

		it('returns "down" while touch is captured', () => {
			const ir = new ItemRenderer();
			(ir as unknown as { _touchCaptured: boolean })._touchCaptured = true;
			expect((ir as unknown as { getCurrentState: () => string }).getCurrentState()).toBe('down');
		});

		it('returns "upAndSelected" when selected and not pressed', () => {
			const ir = new ItemRenderer();
			Object.defineProperty(ir, 'skin', { value: { hasState: () => true }, configurable: true });
			ir.selected = true;
			expect((ir as unknown as { getCurrentState: () => string }).getCurrentState()).toBe('upAndSelected');
		});

		it('returns "downAndSelected" when selected and pressed', () => {
			const ir = new ItemRenderer();
			ir.selected = true;
			(ir as unknown as { _touchCaptured: boolean })._touchCaptured = true;
			expect((ir as unknown as { getCurrentState: () => string }).getCurrentState()).toBe('downAndSelected');
		});

		it('falls back to "down" when selected but skin lacks upAndSelected', () => {
			const ir = new ItemRenderer();
			ir.selected = true;
			Object.defineProperty(ir, 'skin', {
				value: { hasState: (s: string) => s !== 'upAndSelected' },
				configurable: true,
			});
			expect((ir as unknown as { getCurrentState: () => string }).getCurrentState()).toBe('down');
		});
	});

	describe('data', () => {
		it('stores data and dispatches PropertyEvent', () => {
			const ir = new ItemRenderer();
			let prop = '';
			ir.addEventListener('propertyChange', (e) => {
				prop = (e as unknown as { property: string }).property;
			});
			ir.data = { id: 1 };
			expect(ir.data).toEqual({ id: 1 });
			expect(prop).toBe('data');
		});

		it('does not dispatch when data is the same reference', () => {
			const ir = new ItemRenderer();
			const obj = { id: 1 };
			ir.data = obj;
			let count = 0;
			ir.addEventListener('propertyChange', () => count++);
			ir.data = obj;
			expect(count).toBe(0);
		});
	});

	describe('selected', () => {
		it('does not dispatch PropertyEvent on selected change (only invalidateState)', () => {
			const ir = new ItemRenderer();
			let count = 0;
			ir.addEventListener('propertyChange', () => count++);
			ir.selected = true;
			expect(count).toBe(0);
		});
	});
});
