/**
 * ViewStack regression tests.
 *
 * Verifies child visibility switching, index maintenance on add/remove,
 * and Event.CHANGE dispatch.
 */
import { describe, it, expect } from 'vitest';
import { Event } from '@blakron/core';
import { ViewStack, Group, Rect } from '../src/index.js';

function makeChild(w = 100, h = 50): Rect {
	return new Rect(w, h, 0xff0000);
}

describe('ViewStack', () => {
	it('auto-selects index 0 when first child is added', () => {
		const vs = new ViewStack();
		const child = makeChild();
		vs.addChild(child);
		expect(vs.selectedIndex).toBe(0);
		expect(vs.selectedChild).toBe(child);
		expect(child.visible).toBe(true);
	});

	it('only the selected child is visible', () => {
		const vs = new ViewStack();
		const a = makeChild();
		const b = makeChild();
		vs.addChild(a);
		vs.addChild(b);
		// a is selected (index 0), b hidden.
		expect(a.visible).toBe(true);
		expect(b.visible).toBe(false);

		vs.selectedIndex = 1;
		expect(a.visible).toBe(false);
		expect(b.visible).toBe(true);
	});

	it('dispatches Event.CHANGE on selectedIndex change', () => {
		const vs = new ViewStack();
		vs.addChild(makeChild());
		vs.addChild(makeChild());

		let count = 0;
		vs.addEventListener(Event.CHANGE, () => count++);

		vs.selectedIndex = 1;
		expect(count).toBe(1);

		// Same index — no dispatch.
		vs.selectedIndex = 1;
		expect(count).toBe(1);
	});

	it('selecting an out-of-range index clears selection', () => {
		const vs = new ViewStack();
		vs.addChild(makeChild());
		expect(vs.selectedIndex).toBe(0);

		vs.selectedIndex = 99;
		expect(vs.selectedIndex).toBe(-1);
		expect(vs.selectedChild).toBeUndefined();
	});

	it('removing the selected child selects index 0', () => {
		const vs = new ViewStack();
		const a = makeChild();
		const b = makeChild();
		vs.addChild(a);
		vs.addChild(b);
		vs.selectedIndex = 1;

		vs.removeChild(b);
		expect(vs.selectedIndex).toBe(0);
		expect(vs.selectedChild).toBe(a);
	});

	it('removing a child before the selected index shifts the index down', () => {
		const vs = new ViewStack();
		const a = makeChild();
		const b = makeChild();
		const c = makeChild();
		vs.addChild(a);
		vs.addChild(b);
		vs.addChild(c);
		vs.selectedIndex = 2; // c selected

		vs.removeChild(a); // remove index 0
		expect(vs.selectedIndex).toBe(1); // shifted from 2 to 1
		expect(vs.selectedChild).toBe(c);
	});
});
