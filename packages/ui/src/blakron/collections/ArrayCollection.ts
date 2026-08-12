import { EventDispatcher, type EventMap } from '@blakron/core';
import { CollectionEvent, CollectionEventKind } from '../events/CollectionEvent.js';
import type { ICollection } from './ICollection.js';

export interface ArrayCollectionEvents extends EventMap {
	[CollectionEvent.COLLECTION_CHANGE]: CollectionEvent;
}

/**
 * A wrapper around a plain `unknown[]` that implements {@link ICollection}.
 *
 * Dispatches {@link CollectionEvent.COLLECTION_CHANGE} whenever items are
 * added, removed, replaced, or the entire source is reset — allowing
 * data-driven components (DataGroup, List, TabBar…) to update efficiently.
 *
 * @defaultProperty source
 */
export class ArrayCollection extends EventDispatcher<ArrayCollectionEvents> implements ICollection {
	// ── Instance fields ───────────────────────────────────────────────────

	private _source: unknown[];

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(source?: unknown[]) {
		super();
		this._source = source ?? [];
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get source(): unknown[] {
		return this._source;
	}

	public set source(value: unknown[]) {
		this._source = value ?? [];
		this._dispatchCoEvent(CollectionEventKind.RESET);
	}

	public get length(): number {
		return this._source.length;
	}

	// ── Public methods ────────────────────────────────────────────────────

	public getItemAt(index: number): unknown {
		return this._source[index];
	}

	public getItemIndex(item: unknown): number {
		return this._source.indexOf(item);
	}

	public addItem(item: unknown): void {
		this._source.push(item);
		this._dispatchCoEvent(CollectionEventKind.ADD, this._source.length - 1, -1, [item]);
	}

	public addItemAt(item: unknown, index: number): void {
		if (index < 0 || index > this._source.length) {
			throw new RangeError(`ArrayCollection.addItemAt: index ${index} out of range`);
		}
		this._source.splice(index, 0, item);
		this._dispatchCoEvent(CollectionEventKind.ADD, index, -1, [item]);
	}

	public removeItemAt(index: number): unknown {
		if (index < 0 || index >= this._source.length) {
			throw new RangeError(`ArrayCollection.removeItemAt: index ${index} out of range`);
		}
		const item = this._source.splice(index, 1)[0];
		this._dispatchCoEvent(CollectionEventKind.REMOVE, index, -1, [item]);
		return item;
	}

	public replaceItemAt(item: unknown, index: number): unknown {
		if (index < 0 || index >= this._source.length) {
			throw new RangeError(`ArrayCollection.replaceItemAt: index ${index} out of range`);
		}
		const old = this._source.splice(index, 1, item)[0];
		this._dispatchCoEvent(CollectionEventKind.REPLACE, index, -1, [item], [old]);
		return old;
	}

	public itemUpdated(item: unknown): void {
		const index = this.getItemIndex(item);
		if (index !== -1) {
			this._dispatchCoEvent(CollectionEventKind.UPDATE, index, -1, [item]);
		}
	}

	public removeAll(): void {
		const items = this._source.slice();
		this._source.length = 0;
		this._dispatchCoEvent(CollectionEventKind.REMOVE, 0, -1, items);
	}

	/**
	 * Replace all items with a new source. Unlike setting `source`, this does
	 * **not** reset scroll position in the view — individual add/remove events
	 * are dispatched instead.
	 */
	public replaceAll(newSource: unknown[]): void {
		const src = newSource ?? [];
		const newLen = src.length;
		const oldLen = this._source.length;
		for (let i = newLen; i < oldLen; i++) {
			this.removeItemAt(newLen);
		}
		for (let i = 0; i < newLen; i++) {
			if (i >= oldLen) this.addItemAt(src[i], i);
			else this.replaceItemAt(src[i], i);
		}
		this._source = src;
	}

	public refresh(): void {
		this._dispatchCoEvent(CollectionEventKind.REFRESH);
	}

	/**
	 * Sort the collection in place using a comparator function.
	 * Dispatches REFRESH after sorting.
	 */
	public sort(compareFunction: (a: unknown, b: unknown) => number): void {
		this._source.sort(compareFunction);
		this._dispatchCoEvent(CollectionEventKind.REFRESH);
	}

	/**
	 * Sort the collection by a field name (Egret-compatible sortOn).
	 * @param fieldName Property name to sort by.
	 * @param options   Sort options: 0=ascending string, 4=descending, 16=numeric.
	 */
	public sortOn(fieldName: string, options = 0): void {
		const descending = (options & 4) !== 0;
		const numeric = (options & 16) !== 0;
		this._source.sort((a, b) => {
			const va = (a as Record<string, unknown>)[fieldName];
			const vb = (b as Record<string, unknown>)[fieldName];
			let result: number;
			if (numeric) {
				result = (Number(va) || 0) - (Number(vb) || 0);
			} else {
				result = String(va ?? '').localeCompare(String(vb ?? ''));
			}
			return descending ? -result : result;
		});
		this._dispatchCoEvent(CollectionEventKind.REFRESH);
	}

	/**
	 * Filter the collection in place, keeping only items that pass the test.
	 * Dispatches REFRESH after filtering.
	 * Note: items that are filtered out are removed from the source array.
	 */
	public filterFunction(testFn: (item: unknown) => boolean): void {
		this._source = this._source.filter(testFn);
		this._dispatchCoEvent(CollectionEventKind.REFRESH);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _dispatchCoEvent(
		kind: CollectionEventKind,
		location = -1,
		oldLocation = -1,
		items: unknown[] = [],
		oldItems: unknown[] = [],
	): void {
		CollectionEvent.dispatchCollectionEvent(this, kind, location, oldLocation, items, oldItems);
	}
}
