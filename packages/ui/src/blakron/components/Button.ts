import { Component } from './Component.js';
import { Event, TouchEvent, DisplayObject } from '@blakron/core';
import type { Stage, Texture } from '@blakron/core';
import type { IDisplayText } from '../core/IDisplayText.js';
import type { Image } from './Image.js';
import type { Label } from './Label.js';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * Button component with label, icon, and state management.
 *
 * States: `up`, `down`, `disabled`, `upAndSelected`, `downAndSelected`, `disabledAndSelected`.
 *
 * When the button is tapped (and enabled), it calls `buttonReleased()` which subclasses
 * can override. If `toggle` is true, the `selected` state is toggled automatically.
 */
export class Button extends Component implements IDisplayText {
	// ── Instance fields ───────────────────────────────────────────────────

	public labelDisplay?: Label;
	public iconDisplay?: Image;

	private _label = '';
	private _icon?: string | Texture;
	private _selected = false;
	private _toggle = false;
	private _touchCaptured = false;
	private _touchStage?: Stage;
	private _stickyHighlighting = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.touchChildren = false;
		this.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get label(): string {
		return this._label;
	}

	public set label(value: string) {
		this._label = value;
		if (this.labelDisplay) {
			this.labelDisplay.text = value;
		}
	}

	public get text(): string {
		return this._label;
	}

	public get icon(): string | Texture | undefined {
		return this._icon;
	}

	public set icon(value: string | Texture | undefined) {
		this._icon = value;
		if (this.iconDisplay) {
			this.iconDisplay.source = value;
		}
	}

	public get selected(): boolean {
		return this._selected;
	}

	public set selected(value: boolean) {
		if (this._selected === value) return;
		this._selected = value;
		PropertyEvent.dispatchPropertyEvent(this, 'selected');
		this.invalidateState();
	}

	public get toggle(): boolean {
		return this._toggle;
	}

	public set toggle(value: boolean) {
		this._toggle = value;
	}

	public get touchCaptured(): boolean {
		return this._touchCaptured;
	}

	public override get enabled(): boolean {
		return super.enabled;
	}

	public override set enabled(value: boolean) {
		if (this.enabled === value) return;
		super.enabled = value;
		this.invalidateState();
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override partAdded(partName: string, instance: unknown): void {
		super.partAdded(partName, instance);
		if (partName === 'labelDisplay' && this.labelDisplay) {
			this.labelDisplay.text = this._label;
		} else if (partName === 'iconDisplay' && this.iconDisplay) {
			this.iconDisplay.source = this._icon;
		}
	}

	public override $onRemoveFromStage(): void {
		this._cancelTouchCapture();
		super.$onRemoveFromStage();
	}

	/**
	 * Return the current view state, layering the selected state on top of
	 * the base up/down/disabled states.
	 *
	 * Matches egret `ToggleButton.getCurrentState` (L132-145): if the skin
	 * does not export an `AndSelected` variant, the state falls back to `down`
	 * (or `disabled`) instead of returning a skin-missing state name that
	 * would leave the button visually blank.
	 */
	protected override getCurrentState(): string {
		// Base state (egret Button.getCurrentState)
		let state: string;
		if (!this.enabled) {
			state = 'disabled';
		} else if (this._touchCaptured || this._stickyHighlighting) {
			state = 'down';
		} else {
			state = 'up';
		}

		if (!this._selected) return state;

		const selectedState = state + 'AndSelected';
		if (this.skin?.hasState(selectedState)) return selectedState;
		return state === 'disabled' ? 'disabled' : 'down';
	}

	// ── Protected methods ─────────────────────────────────────────────────

	/**
	 * Called when the user taps the button (touch ends within the button bounds).
	 * Subclasses should override this to perform the button action.
	 * The base implementation handles toggle behavior.
	 */
	protected buttonReleased(): void {
		if (this._toggle) {
			this.selected = !this.selected;
			this._stickyHighlighting = this._selected;
		} else {
			this.invalidateState();
		}
		this.dispatchEventWith(Event.CHANGE);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _onTouchBegin = (_e: Event): void => {
		if (!this.enabled) return;
		this._touchCaptured = true;
		this.invalidateState();
		const stage = this.stage;
		if (stage) {
			this._touchStage = stage;
			stage.addEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
			stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchCancel);
		}
	};

	private _onStageTouchEnd = (e: TouchEvent): void => {
		this._removeStageListeners();
		const target = e.target;
		if (target instanceof DisplayObject && this.contains(target)) {
			this.buttonReleased();
		}
		this._touchCaptured = false;
		this.invalidateState();
	};

	private _onTouchCancel = (_e: Event): void => {
		this._cancelTouchCapture();
	};

	private _removeStageListeners(): void {
		const stage = this._touchStage;
		if (!stage) return;
		stage.removeEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
		stage.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchCancel);
		this._touchStage = undefined;
	}

	private _cancelTouchCapture(): void {
		this._removeStageListeners();
		this._touchCaptured = false;
		this.invalidateState();
	}
}
