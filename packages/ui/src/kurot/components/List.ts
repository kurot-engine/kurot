import { TouchEvent, Event } from '@kurot/core';
import { ListBase } from './ListBase.js';
import { ItemRenderer } from './ItemRenderer.js';
import { ItemTapEvent } from '../events/ItemTapEvent.js';

/**
 * List extends ListBase with touch-to-select interaction.
 *
 * Tapping a renderer selects it (updating `selectedIndex`) and dispatches
 * an {@link ItemTapEvent.ITEM_TAP}.
 *
 * @defaultProperty dataProvider
 */
export class List<T = unknown> extends ListBase<T> {
	// ── Instance fields ───────────────────────────────────────────────────

	private readonly _rendererHandlers = new Map<ItemRenderer<string, T>, (e: Event) => void>();

	// ── Override methods ──────────────────────────────────────────────────

	protected override rendererAdded(renderer: ItemRenderer<string, T>, _index: number, _item: T | undefined): void {
		const handler = (_e: Event): void => {
			const idx = renderer.itemIndex;
			if (idx >= 0) this.setSelectedIndex(idx, true);
			ItemTapEvent.dispatchItemTapEvent(this, renderer.data, idx, renderer);
		};
		this._rendererHandlers.set(renderer, handler);
		renderer.addEventListener(TouchEvent.TOUCH_TAP, handler);
	}

	protected override rendererRemoved(renderer: ItemRenderer<string, T>, _index: number, _item: T | undefined): void {
		const handler = this._rendererHandlers.get(renderer);
		if (handler) {
			this._rendererHandlers.delete(renderer);
			renderer.removeEventListener(TouchEvent.TOUCH_TAP, handler);
		}
	}
}
