import { TouchEvent, Event } from '@blakron/core';
import { ListBase } from './ListBase.js';
import { ItemRenderer } from './ItemRenderer.js';
import { ItemTapEvent } from '../events/ItemTapEvent.js';
import { HorizontalLayout } from '../layouts/HorizontalLayout.js';
import { JustifyAlign } from '../layouts/JustifyAlign.js';
import type { ICollection } from '../collections/ICollection.js';
import { ViewStack } from './ViewStack.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * TabBar — a horizontal strip of selectable tabs.
 *
 * Extends ListBase so it inherits selection logic. Uses a HorizontalLayout
 * by default and dispatches {@link ItemTapEvent.ITEM_TAP} on tap.
 *
 * @defaultProperty dataProvider
 */
export class TabBar extends ListBase {
	// ── Instance fields ───────────────────────────────────────────────────

	private readonly _rendererHandlers = new Map<ItemRenderer, (e: Event) => void>();
	private _viewStack?: ViewStack;
	private _indexBeingUpdated = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.requireSelection = true;
		this.useVirtualLayout = false;
	}

	// ── Override methods ──────────────────────────────────────────────────

	/**
	 * Override dataProvider to detect ViewStack and set up bidirectional binding:
	 * TabBar CHANGE → ViewStack.selectedIndex, ViewStack PropertyChange → TabBar.selectedIndex.
	 */
	public override get dataProvider(): ICollection | undefined {
		return super.dataProvider;
	}

	public override set dataProvider(value: ICollection | undefined) {
		// Clean up previous ViewStack binding
		if (this._viewStack) {
			this._viewStack.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onViewStackPropChange);
			this.removeEventListener(Event.CHANGE, this._onTabBarChange);
			this._viewStack = undefined;
		}
		super.dataProvider = value;
		// Set up new ViewStack binding
		if (value instanceof ViewStack) {
			this._viewStack = value;
			value.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onViewStackPropChange);
			this.addEventListener(Event.CHANGE, this._onTabBarChange);
		}
	}

	private _onTabBarChange = (): void => {
		if (!this._viewStack) return;
		this._indexBeingUpdated = true;
		this._viewStack.selectedIndex = this.selectedIndex;
		this._indexBeingUpdated = false;
	};

	private _onViewStackPropChange = (e: Event): void => {
		if (!this._viewStack || this._indexBeingUpdated) return;
		const pe = e as PropertyEvent;
		if (pe.property === 'selectedIndex') {
			this.setSelectedIndex(this._viewStack.selectedIndex, false);
		}
	};

	public override createChildren(): void {
		if (!this.layout) {
			const hl = new HorizontalLayout();
			hl.gap = 0;
			hl.horizontalAlign = JustifyAlign.CONTENT_JUSTIFY;
			this.layout = hl;
		}
		super.createChildren();
	}

	protected override rendererAdded(renderer: ItemRenderer, _index: number, _item: unknown): void {
		const handler = (_e: Event): void => {
			const idx = renderer.itemIndex;
			if (idx >= 0) this.setSelectedIndex(idx, true);
			ItemTapEvent.dispatchItemTapEvent(this, renderer.data, idx, renderer);
		};
		this._rendererHandlers.set(renderer, handler);
		renderer.addEventListener(TouchEvent.TOUCH_TAP, handler);
	}

	protected override rendererRemoved(renderer: ItemRenderer, _index: number, _item: unknown): void {
		const handler = this._rendererHandlers.get(renderer);
		if (handler) {
			this._rendererHandlers.delete(renderer);
			renderer.removeEventListener(TouchEvent.TOUCH_TAP, handler);
		}
	}
}
