import type { IEventDispatcher, EventMap } from '@kurot/core';
import type { CollectionEvent } from '../events/CollectionEvent.js';
import type { TypedEventListeners } from '../events/TypedEventListeners.js';

/**
 * Data-bearing changes emitted by an observable collection.
 */
export interface ICollectionEvents<T = unknown> extends EventMap {
	/**
	 * Mutation notification preserving provider item values and identities.
	 */
	[CollectionEvent.COLLECTION_CHANGE]: CollectionEvent<T>;
}

/**
 * Interface for collection data sources used by data-driven components
 * (DataGroup, List, TabBar, etc.).
 *
 * Implementations dispatch {@link CollectionEvent.COLLECTION_CHANGE} when
 * the underlying data changes so that views can update accordingly.
 */
export interface ICollection<T = unknown> extends IEventDispatcher {
	/**
	 * Observes typed collection mutations; other event names retain Core semantics.
	 */
	addEventListener: TypedEventListeners<ICollectionEvents<T>>['addEventListener'];
	/**
	 * Observes one mutation using Core's existing once-listener behavior.
	 */
	once: TypedEventListeners<ICollectionEvents<T>>['once'];
	/**
	 * Removes the matching listener and capture phase without dispatching events.
	 */
	removeEventListener: TypedEventListeners<ICollectionEvents<T>>['removeEventListener'];

	/**
	 * The number of items in this collection.
	 * `0` means empty, `-1` means length is unknown.
	 */
	readonly length: number;

	/**
	 * Returns the item at the specified index, or `undefined` if none.
	 */
	getItemAt(index: number): T | undefined;

	/**
	 * Returns the index of the given item, or `-1` if not found.
	 */
	getItemIndex(item: T | undefined): number;
}
