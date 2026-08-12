import { DisplayObject, TouchEvent, Event, type Stage } from '@blakron/core';
import { Component } from './Component.js';
import { Button } from './Button.js';
import { UIEvent } from '../events/UIEvent.js';
import type { Label } from './Label.js';

/**
 * Panel — a skinnable container with an optional title bar, close button, and drag area.
 *
 * Skin parts:
 * - `titleDisplay`  — Label for the panel title
 * - `closeButton`   — Button that dispatches UIEvent.CLOSING when tapped
 * - `moveArea`      — DisplayObject used as the drag handle
 *
 * Events:
 * - `UIEvent.CLOSING` — dispatched (bubbles, cancelable) when closeButton is tapped
 *
 * @defaultProperty elementsContent
 */
export class Panel extends Component {
	// ── Instance fields ───────────────────────────────────────────────────

	public closeButton?: Button;
	public moveArea?: DisplayObject;

	private _title = '';
	private _titleChanged = false;
	private _titleDisplay?: Label;
	private _dragStartX = 0;
	private _dragStartY = 0;
	private _panelStartX = 0;
	private _panelStartY = 0;
	private _dragStage?: Stage;

	// ── Default property (EXML children) ───────────────────────────────

	/**
	 * Write-only: adds EXML-declared children to the panel.
	 * Mirrors Egret's `registerProperty(Panel, "elementsContent", "Array", true)`.
	 */
	public set elementsContent(value: DisplayObject[] | undefined) {
		if (!value) return;
		for (const child of value) {
			this.addChild(child);
		}
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get title(): string {
		return this._title;
	}

	public set title(value: string) {
		if (this._title === value) return;
		this._title = value;
		this._titleChanged = true;
		this.invalidateProperties();
	}

	public get titleDisplay(): Label | undefined {
		return this._titleDisplay;
	}

	public set titleDisplay(value: Label | undefined) {
		if (this._titleDisplay === value) return;
		this._titleDisplay = value;
		if (value && this._title) value.text = this._title;
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override commitProperties(): void {
		super.commitProperties();
		if (this._titleChanged) {
			this._titleChanged = false;
			if (this._titleDisplay) this._titleDisplay.text = this._title;
		}
	}

	protected override partAdded(partName: string, instance: unknown): void {
		super.partAdded(partName, instance);
		if (instance instanceof Button && partName === 'closeButton') {
			this.closeButton = instance;
			instance.addEventListener(TouchEvent.TOUCH_TAP, this._onCloseButtonTap);
		} else if (instance instanceof DisplayObject && partName === 'moveArea') {
			this.moveArea = instance;
			instance.addEventListener(TouchEvent.TOUCH_BEGIN, this._onMoveAreaTouchBegin);
		}
	}

	protected override partRemoved(partName: string, instance: unknown): void {
		super.partRemoved(partName, instance);
		if (instance instanceof Button && partName === 'closeButton') {
			instance.removeEventListener(TouchEvent.TOUCH_TAP, this._onCloseButtonTap);
			this.closeButton = undefined;
		} else if (instance instanceof DisplayObject && partName === 'moveArea') {
			this._removeDragListeners();
			instance.removeEventListener(TouchEvent.TOUCH_BEGIN, this._onMoveAreaTouchBegin);
			this.moveArea = undefined;
		}
	}

	public override $onRemoveFromStage(): void {
		this._removeDragListeners();
		super.$onRemoveFromStage();
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Close the panel by removing it from its parent.
	 * Called automatically after UIEvent.CLOSING if not cancelled.
	 */
	public close(): void {
		if (this.parent) this.parent.removeChild(this);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _onCloseButtonTap = (): void => {
		if (UIEvent.dispatchUIEvent(this, UIEvent.CLOSING, true, true)) {
			this.close();
		}
	};

	private _onMoveAreaTouchBegin = (e: TouchEvent): void => {
		this.includeInLayout = false;
		this._dragStartX = e.stageX;
		this._dragStartY = e.stageY;
		this._panelStartX = this.x;
		this._panelStartY = this.y;
		const stage = this.stage;
		if (stage) {
			this._dragStage = stage;
			stage.addEventListener(TouchEvent.TOUCH_MOVE, this._onMoveAreaTouchMove);
			stage.addEventListener(TouchEvent.TOUCH_END, this._onMoveAreaTouchEnd);
			stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._onMoveAreaTouchEnd);
		}
	};

	private _onMoveAreaTouchMove = (e: TouchEvent): void => {
		this.x = this._panelStartX + (e.stageX - this._dragStartX);
		this.y = this._panelStartY + (e.stageY - this._dragStartY);
	};

	private _onMoveAreaTouchEnd = (): void => {
		this._removeDragListeners();
	};

	private _removeDragListeners(): void {
		const stage = this._dragStage;
		if (!stage) return;
		stage.removeEventListener(TouchEvent.TOUCH_MOVE, this._onMoveAreaTouchMove);
		stage.removeEventListener(TouchEvent.TOUCH_END, this._onMoveAreaTouchEnd);
		stage.removeEventListener(TouchEvent.TOUCH_CANCEL, this._onMoveAreaTouchEnd);
		this._dragStage = undefined;
	}
}
