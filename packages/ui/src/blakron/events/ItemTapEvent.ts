import { Event, type IEventDispatcher } from '@blakron/core';
import type { ItemRenderer } from '../components/ItemRenderer.js';

export class ItemTapEvent extends Event {
	// ── Static fields ─────────────────────────────────────────────────────

	public static readonly ITEM_TAP = 'itemTap';

	// ── Instance fields ───────────────────────────────────────────────────

	public item: unknown;
	public itemIndex = -1;
	public itemRenderer?: ItemRenderer;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	// ── Public methods ────────────────────────────────────────────────────

	public static dispatchItemTapEvent(
		target: IEventDispatcher,
		item: unknown,
		itemIndex: number,
		itemRenderer?: ItemRenderer,
	): boolean {
		if (!target.hasEventListener(ItemTapEvent.ITEM_TAP)) return true;
		const e = new ItemTapEvent(ItemTapEvent.ITEM_TAP, false, false);
		e.item = item;
		e.itemIndex = itemIndex;
		e.itemRenderer = itemRenderer;
		return target.dispatchEvent(e);
	}
}
