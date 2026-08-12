import { describe, it, expect, vi } from 'vitest';
import { ArrayCollection } from '../src/blakron/collections/ArrayCollection.js';
import { CollectionEventKind } from '../src/blakron/events/CollectionEvent.js';
import { CollectionEvent } from '../src/blakron/events/CollectionEvent.js';

describe('ArrayCollection', () => {
	describe('basic access', () => {
		it('defaults to an empty source when none provided', () => {
			const c = new ArrayCollection();
			expect(c.length).toBe(0);
			expect(c.source).toEqual([]);
		});

		it('wraps the provided source array', () => {
			const c = new ArrayCollection([1, 2, 3]);
			expect(c.length).toBe(3);
			expect(c.getItemAt(1)).toBe(2);
			expect(c.getItemIndex(3)).toBe(2);
		});
	});

	describe('addItem / addItemAt', () => {
		it('appends with addItem and dispatches ADD at the new index', () => {
			const c = new ArrayCollection(['a']);
			const events: Array<{ kind: CollectionEventKind; location: number; items: unknown[] }> = [];
			c.addEventListener(CollectionEvent.COLLECTION_CHANGE, e => {
				events.push({ kind: e.kind, location: e.location, items: e.items });
			});

			c.addItem('b');

			expect(c.source).toEqual(['a', 'b']);
			expect(events).toHaveLength(1);
			expect(events[0]).toMatchObject({ kind: CollectionEventKind.ADD, location: 1, items: ['b'] });
		});

		it('inserts in the middle with addItemAt', () => {
			const c = new ArrayCollection(['a', 'c']);
			c.addItemAt('b', 1);
			expect(c.source).toEqual(['a', 'b', 'c']);
		});

		it('rejects out-of-range indices', () => {
			const c = new ArrayCollection(['a']);
			expect(() => c.addItemAt('x', -1)).toThrow(RangeError);
			expect(() => c.addItemAt('x', 2)).toThrow(RangeError);
			expect(() => c.addItemAt('x', 5)).toThrow(RangeError);
		});

		it('accepts addItemAt at the trailing edge (index === length)', () => {
			const c = new ArrayCollection(['a', 'b']);
			c.addItemAt('c', 2);
			expect(c.source).toEqual(['a', 'b', 'c']);
		});
	});

	describe('removeItemAt', () => {
		it('removes and returns the item, dispatching REMOVE', () => {
			const c = new ArrayCollection(['a', 'b', 'c']);
			const events: CollectionEventKind[] = [];
			c.addEventListener(CollectionEvent.COLLECTION_CHANGE, e => events.push(e.kind));

			const removed = c.removeItemAt(1);

			expect(removed).toBe('b');
			expect(c.source).toEqual(['a', 'c']);
			expect(events).toEqual([CollectionEventKind.REMOVE]);
		});

		it('rejects negative and >= length indices', () => {
			const c = new ArrayCollection(['a']);
			expect(() => c.removeItemAt(-1)).toThrow(RangeError);
			expect(() => c.removeItemAt(1)).toThrow(RangeError);
			expect(() => c.removeItemAt(99)).toThrow(RangeError);
		});
	});

	describe('replaceItemAt', () => {
		it('swaps an item and returns the old one, dispatching REPLACE with both', () => {
			const c = new ArrayCollection(['a', 'b']);
			let captured: CollectionEvent | undefined;
			c.addEventListener(CollectionEvent.COLLECTION_CHANGE, e => (captured = e));

			const old = c.replaceItemAt('B', 1);

			expect(old).toBe('b');
			expect(c.source).toEqual(['a', 'B']);
			expect(captured).toMatchObject({ kind: CollectionEventKind.REPLACE, location: 1 });
			expect(captured?.items).toEqual(['B']);
			expect(captured?.oldItems).toEqual(['b']);
		});
	});

	describe('removeAll', () => {
		it('clears the source and dispatches REMOVE for all items starting at index 0', () => {
			const c = new ArrayCollection(['a', 'b', 'c']);
			let captured: CollectionEvent | undefined;
			c.addEventListener(CollectionEvent.COLLECTION_CHANGE, e => (captured = e));

			c.removeAll();

			expect(c.length).toBe(0);
			expect(captured).toMatchObject({ kind: CollectionEventKind.REMOVE, location: 0 });
			expect(captured?.items).toEqual(['a', 'b', 'c']);
		});
	});

	describe('itemUpdated', () => {
		it('dispatches UPDATE for an existing item', () => {
			const c = new ArrayCollection([{ id: 1 }]);
			const events: CollectionEventKind[] = [];
			c.addEventListener(CollectionEvent.COLLECTION_CHANGE, e => events.push(e.kind));

			c.itemUpdated(c.getItemAt(0));

			expect(events).toEqual([CollectionEventKind.UPDATE]);
		});

		it('is a no-op for an item not in the collection', () => {
			const c = new ArrayCollection(['a']);
			const handler = vi.fn();
			c.addEventListener(CollectionEvent.COLLECTION_CHANGE, handler);

			c.itemUpdated('not-present');

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('source setter', () => {
		it('replaces the source and dispatches RESET (not individual removes)', () => {
			const c = new ArrayCollection(['a', 'b']);
			const kinds: CollectionEventKind[] = [];
			c.addEventListener(CollectionEvent.COLLECTION_CHANGE, e => kinds.push(e.kind));

			c.source = ['x', 'y', 'z'];

			expect(c.source).toEqual(['x', 'y', 'z']);
			// RESET, not three REMOVEs
			expect(kinds).toEqual([CollectionEventKind.RESET]);
		});

		it('source setter coerces null/undefined to empty array', () => {
			const c = new ArrayCollection(['a']);
			c.source = undefined as unknown as [];
			expect(c.source).toEqual([]);
			expect(c.length).toBe(0);
		});
	});

	describe('replaceAll', () => {
		it('grows, shrinks, and overwrites without dispatching RESET', () => {
			const c = new ArrayCollection(['a', 'b', 'c', 'd']);
			const kinds: CollectionEventKind[] = [];
			c.addEventListener(CollectionEvent.COLLECTION_CHANGE, e => kinds.push(e.kind));

			c.replaceAll(['x', 'y']);

			// Trims from 4 down to 2 (two REMOVEs at index 2), then overwrites both (two REPLACEs).
			expect(c.source).toEqual(['x', 'y']);
			expect(kinds).not.toContain(CollectionEventKind.RESET);
		});

		it('grows from empty to N', () => {
			const c = new ArrayCollection();
			c.replaceAll([1, 2, 3]);
			expect(c.source).toEqual([1, 2, 3]);
		});

		it('coerces null/undefined to empty', () => {
			const c = new ArrayCollection(['a']);
			c.replaceAll(undefined as unknown as []);
			expect(c.length).toBe(0);
		});
	});

	describe('sort and filter', () => {
		it('sorts with a comparator and dispatches REFRESH', () => {
			const c = new ArrayCollection([3, 1, 2]);
			const kinds: CollectionEventKind[] = [];
			c.addEventListener(CollectionEvent.COLLECTION_CHANGE, e => kinds.push(e.kind));

			c.sort((a, b) => (a as number) - (b as number));

			expect(c.source).toEqual([1, 2, 3]);
			expect(kinds).toEqual([CollectionEventKind.REFRESH]);
		});

		it('sortOn ascending by default', () => {
			const c = new ArrayCollection([{ n: 'b' }, { n: 'a' }, { n: 'c' }]);
			c.sortOn('n');
			expect(c.source.map(i => (i as { n: string }).n)).toEqual(['a', 'b', 'c']);
		});

		it('sortOn descending with option 4', () => {
			const c = new ArrayCollection([{ n: 'a' }, { n: 'c' }, { n: 'b' }]);
			c.sortOn('n', 4);
			expect(c.source.map(i => (i as { n: string }).n)).toEqual(['c', 'b', 'a']);
		});

		it('sortOn numeric ascending with option 16', () => {
			const c = new ArrayCollection([{ v: 10 }, { v: 2 }, { v: 1 }]);
			c.sortOn('v', 16);
			expect(c.source.map(i => (i as { v: number }).v)).toEqual([1, 2, 10]);
		});

		it('filterFunction keeps only passing items', () => {
			const c = new ArrayCollection([1, 2, 3, 4, 5]);
			c.filterFunction(i => (i as number) % 2 === 0);
			expect(c.source).toEqual([2, 4]);
		});

		it('refresh dispatches REFRESH without changing data', () => {
			const c = new ArrayCollection([1, 2]);
			const kinds: CollectionEventKind[] = [];
			c.addEventListener(CollectionEvent.COLLECTION_CHANGE, e => kinds.push(e.kind));

			c.refresh();

			expect(c.source).toEqual([1, 2]);
			expect(kinds).toEqual([CollectionEventKind.REFRESH]);
		});
	});
});
