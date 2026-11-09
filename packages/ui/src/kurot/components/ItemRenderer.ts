import { TouchEvent, type Stage } from '@kurot/core';
import { Component } from './Component.js';
import { Label } from './Label.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import type { IItemRenderer } from '../core/IItemRenderer.js';

/**
 * Base class for item renderers used in data-driven containers
 * (DataGroup, List, TabBar…).
 *
 * Selected items use the skin's `upAndSelected`, `downAndSelected`, or
 * `disabledAndSelected` state when declared. Without the matching state,
 * enabled items use `down` and disabled items use `disabled`.
 *
 * @skinPart labelDisplay — optional Label for the item label
 */
export class ItemRenderer<TSkin extends string = string, T = unknown> extends Component<TSkin> implements IItemRenderer<T> {
	// ── Instance fields ───────────────────────────────────────────────────

	public itemIndex = -1;

	/**
	 * Skin part that displays the item label.
	 * When present, `data` is automatically synchronized to its text.
	 * @skinPart
	 */
	public labelDisplay?: Label;

	private _data: T | undefined;
	private _selected = false;
	private readonly _pressedTouches = new Set<number>();
	private _touchStage?: Stage;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get data(): T | undefined {
		return this._data;
	}

	public set data(value: T | undefined) {
		if (this._data === value) return;
		if (this._pressedTouches.size) {
			this._releaseTouchCapture();
		}
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

	public override $setVisible(value: boolean): void {
		super.$setVisible(value);
		// DataGroup hides pooled renderers without removing them from the stage.
		if (!value && this._pressedTouches.size) {
			this._releaseTouchCapture();
		}
	}

	public override $onRemoveFromStage(): void {
		this._releaseTouchCapture();
		super.$onRemoveFromStage();
	}

	protected override getSkinPartValidator(name: string): ((value: unknown) => boolean) | undefined {
		if (name === 'labelDisplay') {
			return value => value instanceof Label;
		}
		return super.getSkinPartValidator(name);
	}

	protected override onSkinReady(): void {
		super.onSkinReady();
		const { labelDisplay } = this;
		if (labelDisplay instanceof Label) {
			this._syncLabel();
		}
	}

	protected override getCurrentState(): string {
		let state: string;
		if (!this.enabled) {
			state = 'disabled';
		} else {
			state = this._pressedTouches.size ? 'down' : 'up';
		}
		if (!this._selected) {
			return state;
		}
		const selectedState = state + 'AndSelected';
		if (this.skin?.hasState(selectedState)) {
			return selectedState;
		}
		return state === 'disabled' ? 'disabled' : 'down';
	}

	// ── Protected methods ─────────────────────────────────────────────────

	/**
	 * Called after `data` changes. Override to update the view.
	 */
	protected dataChanged(): void {
		this._syncLabel();
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _syncLabel(): void {
		if (this.labelDisplay) {
			this.labelDisplay.text = this._data == null ? '' : String(this._data);
		}
	}

	private _onTouchBegin = (e: TouchEvent): void => {
		const stage = this.stage;
		if (!stage) {
			return;
		}
		this._touchStage = stage;
		// Release the visual press even if a descendant stops the bubbling end.
		stage.addEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd, true);
		stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._onStageTouchEnd, true);
		this._pressedTouches.add(e.touchPointID);
		this.invalidateState();
		e.updateAfterEvent();
	};

	private _onStageTouchEnd = (e: TouchEvent): void => {
		if (this._pressedTouches.delete(e.touchPointID) && !this._pressedTouches.size) {
			this._releaseTouchCapture();
		}
	};

	private _releaseTouchCapture(): void {
		const stage = this._touchStage;
		stage?.removeEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd, true);
		stage?.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onStageTouchEnd, true);
		this._touchStage = undefined;
		this._pressedTouches.clear();
		this.invalidateState();
	}
}
