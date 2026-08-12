import { Component } from './Component.js';
import type { IViewport } from '../core/IViewport.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import { Event } from '@blakron/core';

/**
 * Base class for scroll bars.
 *
 * Connects to an IViewport and positions a `thumb` skin part based on the
 * viewport's scroll position relative to its content size.
 *
 * @skinPart thumb — the draggable thumb indicator.
 */
export class ScrollBarBase extends Component {
	// ── Instance fields ───────────────────────────────────────────────────

	public thumb?: IUIComponent;
	public autoVisibility = true;

	private _viewport?: IViewport;

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get viewport(): IViewport | undefined {
		return this._viewport;
	}

	public set viewport(value: IViewport | undefined) {
		if (value === this._viewport) return;
		const vp = this._viewport;
		if (vp) {
			vp.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropChange);
			vp.removeEventListener(Event.RESIZE, this._onResize);
		}
		this._viewport = value;
		if (value) {
			value.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropChange);
			value.addEventListener(Event.RESIZE, this._onResize);
		}
		this.invalidateDisplayList();
	}

	// ── Protected methods ─────────────────────────────────────────────────

	/**
	 * Called when viewport properties (scrollH, scrollV, contentWidth, etc.) change.
	 * Override in subclasses to react.
	 */
	protected onPropertyChanged(_event: PropertyEvent): void {}

	// ── Private methods ───────────────────────────────────────────────────

	private _onPropChange = (e: Event): void => {
		this.onPropertyChanged(e as PropertyEvent);
	};

	private _onResize = (_e: Event): void => {
		this.invalidateDisplayList();
	};
}
