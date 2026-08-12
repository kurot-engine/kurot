import { TouchEvent, Event, DisplayObject, DisplayObjectContainer, Matrix } from '@blakron/core';
import { Component } from './Component.js';
import { List } from './List.js';
import { Scroller } from './Scroller.js';
import type { ArrayCollection } from '../collections/ArrayCollection.js';
import type { IDisplayText } from '../core/IDisplayText.js';
import type { Button } from './Button.js';
import type { Label } from './Label.js';

/**
 * ComboBox — a drop-down selection component.
 *
 * Displays a trigger button showing the currently selected item's label,
 * and a drop-down list that appears when the trigger is tapped.
 *
 * @skinPart labelDisplay — Label showing the selected item label
 * @skinPart button        — the trigger Button that toggles the drop-down
 * @skinPart dropDown      — the drop-down container (typically a Scroller or Group)
 * @skinPart list          — the List inside the drop-down for item selection
 *
 * States: `normal`, `open`, `disabled`.
 *
 * @defaultProperty dataProvider
 */
export class ComboBox extends Component implements IDisplayText {
	// ── Instance fields ───────────────────────────────────────────────────

	public labelDisplay?: Label;
	public button?: Button;
	public dropDown?: Scroller;
	public list?: List;

	private _dataProvider?: ArrayCollection;
	private _selectedIndex = -1;
	private _selectedItem: unknown;
	private _labelField = 'label';
	private _labelFunction?: (item: unknown) => string;
	private _isOpen = false;
	private _prompt = '';
	private _openParentIndex = -1;
	private _dropDownParent?: DisplayObjectContainer;
	private _dropDownParentIndex = -1;
	private _dropDownLocalMatrix?: Matrix;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.touchChildren = true;
		this.addEventListener(TouchEvent.TOUCH_TAP, this._onTriggerTap);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	/** The data provider for the drop-down list items. */
	public get dataProvider(): ArrayCollection | undefined {
		return this._dataProvider;
	}

	public set dataProvider(value: ArrayCollection | undefined) {
		if (this._dataProvider === value) return;
		this._dataProvider = value;
		if (this.list) {
			this.list.dataProvider = value;
		}
		this.invalidateProperties();
	}

	/** Index of the currently selected item, or -1 if nothing is selected. */
	public get selectedIndex(): number {
		return this._selectedIndex;
	}

	public set selectedIndex(value: number) {
		if (this._selectedIndex === value) return;
		this._selectedIndex = value;
		this._updateSelectedItem();
		this.invalidateState();
	}

	/** The currently selected data item. */
	public get selectedItem(): unknown {
		return this._selectedItem;
	}

	public set selectedItem(value: unknown) {
		if (this._selectedItem === value) return;
		if (this._dataProvider) {
			this.selectedIndex = this._dataProvider.getItemIndex(value);
		} else {
			this._selectedItem = value;
			this._updateLabel();
			this.invalidateState();
		}
	}

	/** Whether the drop-down list is currently visible. */
	public get isOpen(): boolean {
		return this._isOpen;
	}

	public set isOpen(value: boolean) {
		if (this._isOpen === value) return;
		this._isOpen = value;
		this._updateDisplayOrder(value);
		this.invalidateState();
		if (this.dropDown) {
			this.dropDown.visible = value;
		}
	}

	/**
	 * The property name on data items to use as the label.
	 * Defaults to `'label'`. Used when `labelFunction` is not set.
	 */
	public get labelField(): string {
		return this._labelField;
	}

	public set labelField(value: string) {
		if (this._labelField === value) return;
		this._labelField = value;
		this._updateLabel();
	}

	/**
	 * A function that converts a data item to a display string.
	 * When set, this takes priority over `labelField`.
	 */
	public get labelFunction(): ((item: unknown) => string) | undefined {
		return this._labelFunction;
	}

	public set labelFunction(value: ((item: unknown) => string) | undefined) {
		if (this._labelFunction === value) return;
		this._labelFunction = value;
		this._updateLabel();
	}

	/** Placeholder text shown when no item is selected. */
	public get prompt(): string {
		return this._prompt;
	}

	public set prompt(value: string) {
		this._prompt = value;
		if (!this._selectedItem && this.labelDisplay) {
			this.labelDisplay.text = value;
		}
	}

	/** The displayed text (selected item label or prompt). */
	public get text(): string {
		if (this.labelDisplay) return this.labelDisplay.text;
		return this.itemToLabel(this._selectedItem);
	}

	public get textColor(): number {
		return this.labelDisplay?.textColor ?? 0;
	}

	public set textColor(value: number) {
		if (this.labelDisplay) {
			this.labelDisplay.textColor = value;
		}
	}

	// ── Override methods ──────────────────────────────────────────────────

	protected override getCurrentState(): string {
		if (!this.enabled) return 'disabled';
		if (this._isOpen) return 'open';
		return 'normal';
	}

	public override partAdded(partName: string, instance: unknown): void {
		super.partAdded(partName, instance);

		if (partName === 'labelDisplay' && instance === this.labelDisplay) {
			this._updateLabel();
		}

		if (partName === 'list' && instance instanceof List) {
			instance.dataProvider = this._dataProvider;
			instance.addEventListener(Event.CHANGE, this._onListChange);
		}

		if (partName === 'dropDown' && instance instanceof Scroller) {
			instance.visible = this._isOpen;
		}
	}

	public override partRemoved(partName: string, instance: unknown): void {
		if (partName === 'dropDown' && instance === this.dropDown) {
			this.close();
		}
		super.partRemoved(partName, instance);

		if (partName === 'list' && instance instanceof List) {
			instance.removeEventListener(Event.CHANGE, this._onListChange);
		}
	}

	public override $onRemoveFromStage(): void {
		this.close();
		super.$onRemoveFromStage();
	}

	public override commitProperties(): void {
		super.commitProperties();
		// Sync selectedIndex → list
		if (this.list && this.list.selectedIndex !== this._selectedIndex) {
			this.list.selectedIndex = this._selectedIndex;
		}
	}

	// ── Public methods ────────────────────────────────────────────────────

	/** Open the drop-down list. */
	public open(): void {
		this.isOpen = true;
	}

	/** Close the drop-down list. */
	public close(): void {
		this.isOpen = false;
	}

	/**
	 * Convert a data item to a label string using `labelFunction` or `labelField`.
	 */
	public itemToLabel(item: unknown): string {
		if (item == null) return '';
		if (this._labelFunction) return this._labelFunction(item);
		if (typeof item === 'string') return item;
		if (typeof item === 'number' || typeof item === 'boolean') return String(item);
		const obj = item as Record<string, unknown>;
		if (this._labelField && this._labelField in obj) {
			return String(obj[this._labelField]);
		}
		return String(item);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _updateSelectedItem(): void {
		if (this._dataProvider && this._selectedIndex >= 0 && this._selectedIndex < this._dataProvider.length) {
			this._selectedItem = this._dataProvider.getItemAt(this._selectedIndex);
		} else {
			this._selectedItem = undefined;
		}
		this._updateLabel();
		this.dispatchEventWith(Event.CHANGE);
	}

	private _updateLabel(): void {
		if (!this.labelDisplay) return;
		if (this._selectedItem != null) {
			this.labelDisplay.text = this.itemToLabel(this._selectedItem);
		} else {
			this.labelDisplay.text = this._prompt;
		}
	}

	private _updateDisplayOrder(isOpen: boolean): void {
		if (isOpen && this._moveDropDownToStage()) return;
		if (!isOpen && this._restoreDropDownParent()) return;
		const parent = this.parent;
		if (!parent) return;
		// A Group layout uses child index as layout order. Moving the ComboBox to
		// the end would therefore move the control itself instead of only raising
		// its drop-down above siblings. Layout users should place the ComboBox in
		// a lightweight wrapper when overlay elevation is required.
		if ((parent as unknown as { layout?: unknown }).layout) return;
		if (isOpen) {
			this._openParentIndex = parent.getChildIndex(this);
			parent.setChildIndex(this, parent.numChildren - 1);
		} else if (this._openParentIndex >= 0) {
			parent.setChildIndex(this, this._openParentIndex);
			this._openParentIndex = -1;
		}
	}

	/** Move only the popup to the stage so layout siblings cannot cover it. */
	private _moveDropDownToStage(): boolean {
		const dropDown = this.dropDown;
		const stage = this.stage;
		const parent = dropDown?.parent;
		if (!dropDown || !stage || !parent || parent === stage) return false;

		this._dropDownParent = parent;
		this._dropDownParentIndex = parent.getChildIndex(dropDown);
		this._dropDownLocalMatrix = dropDown.$getMatrix().clone();
		const stageMatrix = dropDown.$getConcatenatedMatrix().clone();
		parent.removeChild(dropDown);
		stage.addChild(dropDown);
		dropDown.$setMatrix(stageMatrix);
		return true;
	}

	private _restoreDropDownParent(): boolean {
		const dropDown = this.dropDown;
		const parent = this._dropDownParent;
		const matrix = this._dropDownLocalMatrix;
		if (!dropDown || !parent || !matrix) return false;

		dropDown.parent?.removeChild(dropDown);
		parent.addChildAt(dropDown, Math.min(this._dropDownParentIndex, parent.numChildren));
		dropDown.$setMatrix(matrix);
		this._dropDownParent = undefined;
		this._dropDownParentIndex = -1;
		this._dropDownLocalMatrix = undefined;
		return true;
	}

	private _onTriggerTap = (e: Event): void => {
		// If the tap lands inside the open drop-down (e.g. on the list),
		// let the list's selection handler deal with it instead of toggling.
		if (this._isOpen && this.dropDown && e.target instanceof DisplayObject && this.dropDown.contains(e.target)) {
			return;
		}
		this.isOpen = !this._isOpen;
	};

	private _onListChange = (_e: Event): void => {
		if (this.list) {
			this._selectedIndex = this.list.selectedIndex;
			this._updateSelectedItem();
		}
		// Close after selection
		this.close();
	};
}
