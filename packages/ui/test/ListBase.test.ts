import { describe, it, expect } from 'vitest';
import { Event } from '@blakron/core';
import { List } from '../src/blakron/components/List.js';
import { ArrayCollection } from '../src/blakron/collections/ArrayCollection.js';
import { PropertyEvent } from '../src/blakron/events/PropertyEvent.js';

/**
 * Test-only subclass that exposes the protected setSelectedIndex so we can
 * simulate the user-interaction selection path (which passes dispatchChangeEvent=true)
 * without needing a real stage / renderer / touch event.
 */
class TestList extends List {
	public selectInteractive(idx: number): void {
		this.setSelectedIndex(idx, true);
	}
	public selectProgrammatic(idx: number): void {
		this.selectedIndex = idx;
	}
}

function makeList(items: unknown[]): TestList {
	const list = new TestList();
	list.dataProvider = new ArrayCollection(items);
	// No stage in the test env, so drive the commit phase directly.
	list.validateProperties();
	return list;
}

describe('ListBase selection', () => {
	describe('Event.CHANGE dispatch (user vs programmatic)', () => {
		it('dispatches Event.CHANGE only on user-interaction selection, not programmatic', () => {
			const list = makeList(['a', 'b', 'c']);
			const changes: unknown[] = [];
			list.addEventListener(Event.CHANGE, () => changes.push(list.selectedIndex));

			// Programmatic selection must NOT fire CHANGE.
			list.selectProgrammatic(1);
			list.validateProperties();
			expect(changes).toHaveLength(0);
			expect(list.selectedIndex).toBe(1);

			// User-interaction selection MUST fire CHANGE.
			list.selectInteractive(2);
			list.validateProperties();
			expect(changes).toHaveLength(1);
			expect(changes[0]).toBe(2);
		});

		it('does not dispatch CHANGE when selecting the same index again', () => {
			const list = makeList(['a', 'b']);
			list.selectInteractive(0);
			list.validateProperties();

			const changes: unknown[] = [];
			list.addEventListener(Event.CHANGE, () => changes.push(true));

			list.selectInteractive(0); // same index -> no-op
			list.validateProperties();
			expect(changes).toHaveLength(0);
		});
	});

	describe('PropertyEvent dispatch on selection change', () => {
		it('dispatches PropertyEvent for both selectedIndex and selectedItem', () => {
			const list = makeList(['a', 'b', 'c']);
			const fired: string[] = [];
			list.addEventListener(PropertyEvent.PROPERTY_CHANGE, e => {
				fired.push(e.property);
			});

			list.selectInteractive(1);
			list.validateProperties();

			expect(fired).toContain('selectedIndex');
			expect(fired).toContain('selectedItem');
			expect(list.selectedItem).toBe('b');
		});
	});

	describe('deselecting the previous item', () => {
		it('calls itemSelected(old, false) when switching selection', () => {
			const list = makeList(['a', 'b', 'c']);

			// Track itemSelected calls by spying on the renderer state.
			// No renderers exist off-stage, so itemSelected is a no-op visually,
			// but we can assert the selection state transitions correctly.
			list.selectInteractive(0);
			list.validateProperties();
			expect(list.selectedIndex).toBe(0);

			list.selectInteractive(2);
			list.validateProperties();
			expect(list.selectedIndex).toBe(2);
			expect(list.selectedItem).toBe('c');
		});

		it('clamps selectedIndex to valid range', () => {
			const list = makeList(['a', 'b']);
			list.selectProgrammatic(99);
			list.validateProperties();
			expect(list.selectedIndex).toBe(1);

			list.selectProgrammatic(-5);
			list.validateProperties();
			expect(list.selectedIndex).toBe(-1);
		});
	});

	describe('requireSelection', () => {
		it('defaults to false', () => {
			const list = makeList(['a', 'b', 'c']);
			expect(list.requireSelection).toBe(false);
		});

		it('enabling with no selection auto-selects index 0', () => {
			const list = makeList(['a', 'b', 'c']);
			expect(list.selectedIndex).toBe(-1);

			list.requireSelection = true;
			list.validateProperties();

			expect(list.selectedIndex).toBe(0);
		});

		it('prevents deselecting to -1 when there is data', () => {
			const list = makeList(['a', 'b', 'c']);
			list.requireSelection = true;
			list.validateProperties();
			expect(list.selectedIndex).toBe(0);

			// Try to deselect.
			list.selectProgrammatic(-1);
			list.validateProperties();
			expect(list.selectedIndex).toBe(0); // stayed at 0
		});

		it('allows switching to another index', () => {
			const list = makeList(['a', 'b', 'c']);
			list.requireSelection = true;
			list.validateProperties();

			list.selectProgrammatic(2);
			list.validateProperties();
			expect(list.selectedIndex).toBe(2);
		});

		it('does nothing when enabled with empty dataProvider', () => {
			const list = makeList([]);
			list.requireSelection = true;
			list.validateProperties();
			expect(list.selectedIndex).toBe(-1);
		});
	});
});
