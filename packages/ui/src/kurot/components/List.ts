import { DisplayObject, Event, TouchEvent } from '@kurot/core';
import { ListBase } from './ListBase.js';
import { ItemRenderer } from './ItemRenderer.js';
import { ItemTapEvent } from '../events/ItemTapEvent.js';

interface RowPress<T> {
	readonly renderer: ItemRenderer<string, T>;
	cancel(): void;
}

/**
 * List extends ListBase with touch-to-select interaction.
 *
 * A press and release within the same renderer select its item and dispatch
 * one {@link ItemTapEvent.ITEM_TAP}, even if the skin changes the hit child.
 * Scrolling or releasing over another item does not activate the row.
 *
 * @defaultProperty dataProvider
 */
export class List<T = unknown> extends ListBase<T> {
	private readonly _presses = new Map<number, RowPress<T>>();

	public override updateRenderer(renderer: ItemRenderer<string, T>, index: number, item: T | undefined): ItemRenderer<string, T> {
		if (renderer.itemIndex !== index || !Object.is(renderer.data, item)) {
			this._cancelRow(renderer);
		}
		return super.updateRenderer(renderer, index, item);
	}

	public override getVirtualElementAt(index: number): ItemRenderer<string, T> | undefined {
		const previous = this.getRendererAt(index | 0);
		const renderer = super.getVirtualElementAt(index);
		// Reacquiring a pooled row starts a new binding even at the same index with the same data.
		if (renderer && renderer !== previous) {
			this._cancelRow(renderer);
		}
		return renderer;
	}

	protected override rendererAdded(renderer: ItemRenderer<string, T>, _index: number, _item: T | undefined): void {
		renderer.addEventListener(TouchEvent.TOUCH_BEGIN, this._onRowBegin);
	}

	protected override rendererRemoved(renderer: ItemRenderer<string, T>, _index: number, _item: T | undefined): void {
		renderer.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onRowBegin);
		this._cancelRow(renderer);
	}

	private _cancelRow(renderer: ItemRenderer<string, T>): void {
		for (const press of this._presses.values()) {
			if (press.renderer === renderer) {
				press.cancel();
			}
		}
	}

	private _onRowBegin = (event: TouchEvent): void => {
		const renderer = event.currentTarget as ItemRenderer<string, T>;
		const stage = this.stage;
		const index = renderer.itemIndex;
		if (!stage || this.getRendererAt(index) !== renderer) {
			return;
		}
		const id = event.touchPointID;
		const provider = this.dataProvider;
		this._presses.get(id)?.cancel();

		const cancel = (): void => {
			if (this._presses.get(id) !== press) {
				return;
			}
			this._presses.delete(id);
			renderer.removeEventListener(TouchEvent.TOUCH_END, release);
			renderer.removeEventListener(Event.REMOVED_FROM_STAGE, cancel);
			stage.removeEventListener(TouchEvent.TOUCH_BEGIN, terminal, true);
			stage.removeEventListener(TouchEvent.TOUCH_CANCEL, terminal, true);
			stage.removeEventListener(TouchEvent.TOUCH_END, terminal, true);
		};
		const terminal = (end: TouchEvent): void => {
			if (end.touchPointID !== id || this._presses.get(id) !== press) {
				return;
			}
			if (end.type === TouchEvent.TOUCH_END && end.target instanceof DisplayObject && renderer.contains(end.target)) {
				// Let the row handle this END synchronously. If another listener stops propagation,
				// discard the press after dispatch without retaining the pooled event.
				queueMicrotask(cancel);
			} else {
				cancel();
			}
		};
		const release = (end: TouchEvent): void => {
			if (end.touchPointID !== id || this._presses.get(id) !== press) {
				return;
			}
			cancel();
			if (end.isDefaultPrevented() || this.getRendererAt(index) !== renderer || this.dataProvider !== provider || renderer.itemIndex !== index) {
				return;
			}
			this.setSelectedIndex(index, true);
			ItemTapEvent.dispatchItemTapEvent(this, renderer.data, index, renderer);
		};
		const press = { renderer, cancel };
		this._presses.set(id, press);
		renderer.addEventListener(TouchEvent.TOUCH_END, release);
		renderer.addEventListener(Event.REMOVED_FROM_STAGE, cancel);
		stage.addEventListener(TouchEvent.TOUCH_BEGIN, terminal, true);
		stage.addEventListener(TouchEvent.TOUCH_CANCEL, terminal, true);
		stage.addEventListener(TouchEvent.TOUCH_END, terminal, true);
	};
}
