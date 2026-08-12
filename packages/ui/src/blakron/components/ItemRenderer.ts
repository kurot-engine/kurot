import { TouchEvent, Event, type Stage } from '@blakron/core';
import { Component } from './Component.js';
import { Label } from './Label.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import type { IItemRenderer } from '../core/IItemRenderer.js';

/**
 * Base class for item renderers used in data-driven containers
 * (DataGroup, List, TabBar…).
 *
 * States: `up` | `down` | `disabled` | `upAndSelected` | `downAndSelected`
 *
 * @skinPart iconDisplay  — optional DisplayObject for an icon
 * @skinPart labelDisplay — optional Label for the item label
 */
export class ItemRenderer extends Component implements IItemRenderer {
	// ── Instance fields ───────────────────────────────────────────────────

	public itemIndex = -1;

	private _data: unknown;
	private _selected = false;
	private _touchCaptured = false;
	private _touchStage?: Stage;

	/**
	 * Skin part: the label. When present, `data` is auto-synced to its `text`
	 * (fallback for when the EXML `{data}` binding isn't compiled in).
	 */
	public labelDisplay?: Label;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get data(): unknown {
		return this._data;
	}

	public set data(value: unknown) {
		if (this._data === value) return;
		this._data = value;
		PropertyEvent.dispatchPropertyEvent(this, 'data');
		this.dataChanged();
	}

	public get selected(): boolean {
		return this._selected;
	}

	public set selected(value: boolean) {
		if (this._selected === value) return;
		this._selected = value;
		this.invalidateState();
	}

	// ── Override methods ──────────────────────────────────────────────────

	protected override partAdded(partName: string, instance: unknown): void {
		super.partAdded(partName, instance);
		if (partName === 'labelDisplay' && instance instanceof Label) {
			this.labelDisplay = instance;
			this._syncLabel();
		}
	}

	protected override partRemoved(partName: string, instance: unknown): void {
		super.partRemoved(partName, instance);
		if (partName === 'labelDisplay') {
			this.labelDisplay = undefined;
		}
	}

	protected override getCurrentState(): string {
		if (!this.enabled) return 'disabled';
		if (this._touchCaptured) return this._selected ? 'downAndSelected' : 'down';
		if (this._selected) {
			if (this.skin?.hasState('upAndSelected')) return 'upAndSelected';
			return 'down';
		}
		return 'up';
	}

	public override $onRemoveFromStage(): void {
		this._releaseTouchCapture();
		super.$onRemoveFromStage();
	}

	// ── Protected methods ─────────────────────────────────────────────────

	/**
	 * Called after `data` changes. Override to update the view.
	 */
	protected dataChanged(): void {
		this._syncLabel();
	}

	private _syncLabel(): void {
		if (this.labelDisplay) {
			this.labelDisplay.text = this._data == null ? '' : String(this._data);
		}
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _onTouchBegin = (e: TouchEvent): void => {
		const stage = this.stage;
		if (!stage) return;
		this._touchStage = stage;
		stage.addEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
		stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._onStageTouchEnd);
		this._touchCaptured = true;
		this.invalidateState();
		e.updateAfterEvent();
	};

	private _onStageTouchEnd = (_e: Event): void => {
		this._releaseTouchCapture();
	};

	private _releaseTouchCapture(): void {
		const stage = this._touchStage;
		stage?.removeEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
		stage?.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onStageTouchEnd);
		this._touchStage = undefined;
		this._touchCaptured = false;
		this.invalidateState();
	}
}
