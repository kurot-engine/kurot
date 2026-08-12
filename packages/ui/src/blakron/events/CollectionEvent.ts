import { Event, type IEventDispatcher } from '@blakron/core';

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

export class CollectionEvent extends Event {
	// ── Static fields ─────────────────────────────────────────────────────

	public static readonly COLLECTION_CHANGE = 'collectionChange';

	// ── Instance fields ───────────────────────────────────────────────────

	public kind: CollectionEventKind = CollectionEventKind.ADD;
	public items: unknown[] = [];
	public oldItems: unknown[] = [];
	public location = -1;
	public oldLocation = -1;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	// ── Public methods ────────────────────────────────────────────────────

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
