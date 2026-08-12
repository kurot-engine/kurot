import { Event } from '@blakron/core';
import { DataGroup } from './DataGroup.js';
import type { ItemRenderer } from './ItemRenderer.js';
import { CollectionEvent, CollectionEventKind } from '../events/CollectionEvent.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * ListBase extends DataGroup with selection support.
 *
 * Maintains a `selectedIndex` and tracks the currently selected renderer.
 * Subclasses (e.g. List) add touch interaction.
 */
export class ListBase extends DataGroup {
	// ── Sentinel constants ──────────────────────────────────────────────

	/** Sentinel for "no selection" — matches egret `ListBase.NO_SELECTION`. */
	protected static readonly NO_SELECTION = -1;

	// ── Instance fields ───────────────────────────────────────────────────

	private _selectedIndex = -1;
	private _previousSelectedIndex = -1;
	private _selectedIndexChanged = false;
	private _dispatchChangeAfterSelection = false;
	private _requireSelection = false;
	private _requireSelectionChanged = false;

	/** Item passed to selectedItem setter before dataProvider is available (egret `pendingSelectedItem`). */
	private _pendingSelectedItem: unknown;

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get selectedIndex(): number {
		return this._selectedIndex;
	}

	public set selectedIndex(value: number) {
		this.setSelectedIndex(value, false);
	}

	public get selectedItem(): unknown {
		if (this._selectedIndex < 0 || !this.dataProvider) return undefined;
		return this.dataProvider.getItemAt(this._selectedIndex);
	}

	public set selectedItem(value: unknown) {
		if (!this.dataProvider) {
			this._pendingSelectedItem = value;
			this.invalidateProperties();
			return;
		}
		this._pendingSelectedItem = undefined;
		this.selectedIndex = this.dataProvider.getItemIndex(value);
	}

	/**
	 * If `true`, the list always keeps an item selected (defaults to the first).
	 * Setting this to true when no item is selected selects index 0.
	 */
	public get requireSelection(): boolean {
		return this._requireSelection;
	}

	public set requireSelection(value: boolean) {
		if (this._requireSelection === value) return;
		this._requireSelection = value;
		this._requireSelectionChanged = true;
		this.invalidateProperties();
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override commitProperties(): void {
		if (this._requireSelectionChanged) {
			this._requireSelectionChanged = false;
			if (this._requireSelection && this._selectedIndex === -1 && this.dataProvider && this.dataProvider.length > 0) {
				this.setSelectedIndex(0, false);
			}
		}

		// Resolve a pending selectedItem now that dataProvider is available
		// (egret `commitProperties` pendingSelectedItem resolve).
		if (this._pendingSelectedItem !== undefined && this.dataProvider) {
			const item = this._pendingSelectedItem;
			this._pendingSelectedItem = undefined;
			this.setSelectedIndex(this.dataProvider.getItemIndex(item), false);
		}

		if (this._selectedIndexChanged) {
			this._selectedIndexChanged = false;
			this.commitSelection();
		}
		super.commitProperties();
	}

	/**
	 * Override updateRenderer to sync the renderer's `selected` state when it
	 * is created/recycled (matching Egret's `itemSelected` call).
	 */
	public override updateRenderer(renderer: ItemRenderer, itemIndex: number, data: unknown): ItemRenderer {
		this.itemSelected(itemIndex, this._selectedIndex === itemIndex);
		return super.updateRenderer(renderer, itemIndex, data);
	}

	protected override onCollectionChange(event: CollectionEvent): void {
		const kind = event.kind;
		const location = event.location ?? -1;

		switch (kind) {
			case CollectionEventKind.ADD: {
				if (this._requireSelection && this._selectedIndex === -1) {
					this.adjustSelection(location, true);
				} else if (location <= this._selectedIndex) {
					this.adjustSelection(this._selectedIndex + 1, true);
				}
				break;
			}
			case CollectionEventKind.REMOVE: {
				const sel = this._selectedIndex;
				if (location < sel) {
					this.adjustSelection(sel - 1, false);
				} else if (location === sel) {
					if (this.numChildren === 0) {
						this.adjustSelection(-1, false);
					}
				}
				break;
			}
			case CollectionEventKind.RESET:
			case CollectionEventKind.REFRESH: {
				this.dataProviderRefreshed();
				break;
			}
		}

		super.onCollectionChange(event);
	}

	// ── Protected methods ─────────────────────────────────────────────────

	protected setSelectedIndex(value: number, dispatchChangeEvent = false): void {
		if (this._selectedIndex === value) return;
		if (dispatchChangeEvent) {
			this._dispatchChangeAfterSelection = true;
		}
		this._previousSelectedIndex = this._selectedIndex;
		this._selectedIndex = value;
		this._selectedIndexChanged = true;
		this.invalidateProperties();
	}

	protected commitSelection(): boolean {
		const maxIndex = this.dataProvider ? this.dataProvider.length - 1 : -1;
		if (this._selectedIndex < -1) this._selectedIndex = -1;
		if (this._selectedIndex > maxIndex) this._selectedIndex = maxIndex;

		// requireSelection: refuse to deselect when there is data.
		if (this._requireSelection && this._selectedIndex === -1 && this.dataProvider && this.dataProvider.length > 0) {
			this._selectedIndex = this._previousSelectedIndex;
			this._dispatchChangeAfterSelection = false;
			return false;
		}

		// Interactive selection: dispatch CHANGING (cancelable). If prevented,
		// revert to the previous selection.
		if (this._dispatchChangeAfterSelection && this._previousSelectedIndex !== this._selectedIndex) {
			const allowed = this.dispatchEventWith(Event.CHANGING, false, true, true);
			if (!allowed) {
				this.itemSelected(this._selectedIndex, false);
				this._selectedIndex = this._previousSelectedIndex;
				this._dispatchChangeAfterSelection = false;
				return false;
			}
		}

		if (this._previousSelectedIndex !== this._selectedIndex) {
			this.itemSelected(this._previousSelectedIndex, false);
		}
		if (this._selectedIndex >= 0) {
			this.itemSelected(this._selectedIndex, true);
		}

		if (this._dispatchChangeAfterSelection) {
			this._dispatchChangeAfterSelection = false;
			this.dispatchEventWith(Event.CHANGE);
		}
		PropertyEvent.dispatchPropertyEvent(this, 'selectedIndex');
		PropertyEvent.dispatchPropertyEvent(this, 'selectedItem');
		return true;
	}

	/**
	 * Called when an item is selected or deselected.
	 * Override to update renderer visual state.
	 */
	protected itemSelected(index: number, selected: boolean): void {
		const renderer = this.getRendererAt(index);
		if (renderer) renderer.selected = selected;
	}

	/**
	 * Adjust the selection index in response to collection mutations without
	 * dispatching events or calling `itemSelected` (egret `adjustSelection`).
	 *
	 * The index is mutated silently so that multiple add/remove operations
	 * within a single frame only produce one final commit event when
	 * `commitProperties` runs.
	 */
	protected adjustSelection(newIndex: number, _add: boolean): void {
		this._selectedIndex = newIndex;
	}

	/**
	 * Called when the data provider is reset or refreshed (egret parity).
	 * Re-applies {@link requireSelection} logic so that the first item is
	 * automatically selected when the data source is replaced.
	 */
	protected dataProviderRefreshed(): void {
		this._selectedIndex = -1;
		if (this._requireSelection && this.dataProvider && this.dataProvider.length > 0) {
			this.setSelectedIndex(0, false);
		}
	}
}
