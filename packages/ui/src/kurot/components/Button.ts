import { Component } from './Component.js';
import { Event, TouchEvent, DisplayObject } from '@kurot/core';
import type { Stage, Texture } from '@kurot/core';
import type { IDisplayText } from '../core/IDisplayText.js';
import { Image } from './Image.js';
import { Label } from './Label.js';
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

	/**
	 * @skinPart
	 */
	public labelDisplay?: Label;
	/**
	 * @skinPart
	 */
	public iconDisplay?: Image;

	private _label = '';
	private _icon?: string | Texture;
	private _selected = false;
	private _toggle = false;
	private _touchPointID?: number;
	private _touchStage?: Stage;
	private _stickyHighlighting = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.touchChildren = false;
		this.addEventListener(TouchEvent.TOUCH_BEGIN, this._onTouchBegin);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	/**
	 * Button caption, initially empty. Copied into labelDisplay when that optional
	 * skin part is available; changing the label does not load or attach a skin.
	 */
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

	/**
	 * Borrowed Texture or image-adapter string, initially undefined. Passed to the
	 * optional iconDisplay skin part; replacement does not dispose a texture.
	 */
	public get icon(): string | Texture | undefined {
		return this._icon;
	}

	public set icon(value: string | Texture | undefined) {
		this._icon = value;
		if (this.iconDisplay) {
			this.iconDisplay.source = value;
		}
	}

	/**
	 * Selection flag, initially false. Assignment updates view state and dispatches
	 * a property change, but does not dispatch the user CHANGE event itself.
	 */
	public get selected(): boolean {
		return this._selected;
	}

	public set selected(value: boolean) {
		if (this._selected === value) {
			return;
		}
		this._selected = value;
		if (!value) {
			// Deselecting ends the highlight from a completed tap, even when a group owns the selection.
			this._stickyHighlighting = false;
		}
		PropertyEvent.dispatchPropertyEvent(this, 'selected');
		this.invalidateState();
	}

	/**
	 * Whether a completed user press flips selected; defaults to false. User
	 * release dispatches CHANGE; setting this flag does not perform a press.
	 */
	public get toggle(): boolean {
		return this._toggle;
	}

	public set toggle(value: boolean) {
		this._toggle = value;
	}

	/**
	 * Whether a press is in progress, initially false. Stage removal cancels
	 * capture and detaches internal stage handlers. Application event handlers remain
	 * owned by the game and must be removed when their round/view ends.
	 */
	public get touchCaptured(): boolean {
		return this._touchPointID !== undefined;
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

	public override $onRemoveFromStage(): void {
		this._cancelTouchCapture();
		super.$onRemoveFromStage();
	}

	// ── Protected methods ─────────────────────────────────────────────────

	protected override getSkinPartValidator(name: string): ((value: unknown) => boolean) | undefined {
		if (name === 'labelDisplay') {
			return value => value instanceof Label;
		}
		if (name === 'iconDisplay') {
			return value => value instanceof Image;
		}
		return super.getSkinPartValidator(name);
	}

	protected override onSkinReady(): void {
		super.onSkinReady();
		const { labelDisplay, iconDisplay } = this;
		if (labelDisplay instanceof Label) {
			labelDisplay.text = this._label;
		}
		if (iconDisplay instanceof Image) {
			iconDisplay.source = this._icon;
		}
	}

	/**
	 * Return the current view state, layering the selected state on top of
	 * the base up/down/disabled states.
	 *
	 * If the skin
	 * does not export an `AndSelected` variant, the state falls back to `down`
	 * (or `disabled`) instead of returning a skin-missing state name that
	 * would leave the button visually blank.
	 */
	protected override getCurrentState(): string {
		// Resolve the base input state before applying selection.
		let state: string;
		if (!this.enabled) {
			state = 'disabled';
		} else if (this.touchCaptured || this._stickyHighlighting) {
			state = 'down';
		} else {
			state = 'up';
		}

		if (!this._selected) return state;

		const selectedState = state + 'AndSelected';
		if (this.skin?.hasState(selectedState)) return selectedState;
		return state === 'disabled' ? 'disabled' : 'down';
	}

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

	private _onTouchBegin = (e: TouchEvent): void => {
		if (!this.enabled || this.touchCaptured) {
			return;
		}
		this._touchPointID = e.touchPointID;
		this.invalidateState();
		const stage = this.stage;
		if (stage) {
			this._touchStage = stage;
			stage.addEventListener(TouchEvent.TOUCH_END, this._onStageTouchEnd);
			stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._onTouchCancel);
		}
	};

	private _onStageTouchEnd = (e: TouchEvent): void => {
		if (e.touchPointID !== this._touchPointID) {
			return;
		}
		this._removeStageListeners();
		const target = e.target;
		if (!e.isDefaultPrevented() && target instanceof DisplayObject && this.contains(target)) {
			this.buttonReleased();
		}
		this._touchPointID = undefined;
		this.invalidateState();
	};

	private _onTouchCancel = (e: TouchEvent): void => {
		if (e.touchPointID === this._touchPointID) {
			this._cancelTouchCapture();
		}
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
		this._touchPointID = undefined;
		this.invalidateState();
	}
}
