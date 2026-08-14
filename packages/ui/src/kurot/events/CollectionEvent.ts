import { Event, type IEventDispatcher } from '@kurot/core';

/**
 * Change operations reported by {@link CollectionEvent}.
 */
export const CollectionEventKind = {
	ADD: 'add',
	REMOVE: 'remove',
	UPDATE: 'update',
	RESET: 'reset',
	REFRESH: 'refresh',
	REPLACE: 'replace',
	MOVE: 'move',
} as const;

export type CollectionEventKind = (typeof CollectionEventKind)[keyof typeof CollectionEventKind];

/**
 * Describes a change to an observable collection.
 */
export class CollectionEvent extends Event {
	// ── Static fields ─────────────────────────────────────────────────────

	public static readonly COLLECTION_CHANGE = 'collectionChange';

	// ── Instance fields ───────────────────────────────────────────────────

	/**
	 * Operation that changed the collection.
	 */
	public kind: CollectionEventKind = CollectionEventKind.ADD;
	/**
	 * Items added, updated, or moved by the operation.
	 */
	public items: unknown[] = [];
	/**
	 * Items removed or replaced by the operation.
	 */
	public oldItems: unknown[] = [];
	/**
	 * Resulting collection index, or `-1` when the operation has no index.
	 */
	public location = -1;
	/**
	 * Previous collection index, or `-1` when the operation has no previous index.
	 */
	public oldLocation = -1;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Dispatches a collection-change event when the target has a listener.
	 * Returns `true` without allocating an event when no listener is registered.
	 */
	public static dispatchCollectionEvent(
		target: IEventDispatcher,
		kind: CollectionEventKind,
		location = -1,
		oldLocation = -1,
		items: unknown[] = [],
		oldItems: unknown[] = [],
	): boolean {
		if (!target.hasEventListener(CollectionEvent.COLLECTION_CHANGE)) return true;
		const e = new CollectionEvent(CollectionEvent.COLLECTION_CHANGE);
		e.kind = kind;
		e.location = location;
		e.oldLocation = oldLocation;
		e.items = items;
		e.oldItems = oldItems;
		return target.dispatchEvent(e);
	}
}
