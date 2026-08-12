import type { IEventDispatcher } from '@blakron/core';

/**
 * Interface for collection data sources used by data-driven components
 * (DataGroup, List, TabBar, etc.).
 *
 * Implementations dispatch {@link CollectionEvent.COLLECTION_CHANGE} when
 * the underlying data changes so that views can update accordingly.
 */
export interface ICollection extends IEventDispatcher {
	/**
	 * The number of items in this collection.
	 * `0` means empty, `-1` means length is unknown.
	 */
	readonly length: number;

	/**
	 * Returns the item at the specified index, or `undefined` if none.
	 */
	getItemAt(index: number): unknown;

	/**
	 * Returns the index of the given item, or `-1` if not found.
	 */
	getItemIndex(item: unknown): number;
}
