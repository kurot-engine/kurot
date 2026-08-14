import { Event, type IEventDispatcher } from '@kurot/core';
import type { ItemRenderer } from '../components/ItemRenderer.js';

/**
 * Reports activation of an item in an item-rendering component.
 */
export class ItemTapEvent extends Event {
	// ── Static fields ─────────────────────────────────────────────────────

	public static readonly ITEM_TAP = 'itemTap';

	// ── Instance fields ───────────────────────────────────────────────────

	/**
	 * Data item that was activated.
	 */
	public item: unknown;
	/**
	 * Index of the activated item in the data provider.
	 */
	public itemIndex = -1;
	/**
	 * Renderer that received the interaction, when one is available.
	 */
	public itemRenderer?: ItemRenderer;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Dispatches an item-tap event when the target has a listener.
	 * Returns `true` without allocating an event when no listener is registered.
	 */
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
