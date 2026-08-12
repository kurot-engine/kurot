import { Sprite, Rectangle, Point, DisplayObject, Event, type DisplayObjectEvents, type Matrix } from '@blakron/core';
import { UIState, isUIComponent } from '../core/UIState.js';
import type { IUIOwner } from '../core/UIState.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import type { IViewport } from '../core/IViewport.js';
import type { ILayoutTarget } from '../layouts/ILayoutTarget.js';
import type { LayoutBase } from '../layouts/LayoutBase.js';
import type { State } from '../states/State.js';
import type { Component } from './Component.js';
import type { ComponentEvents } from './Component.js';
import type { Skin } from './Skin.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import { CollectionEvent } from '../events/CollectionEvent.js';
import { ItemTapEvent } from '../events/ItemTapEvent.js';
import { BasicLayout } from '../layouts/BasicLayout.js';

/**
 * EventMap for Group and all its subclasses (DataGroup, ListBase, List, TabBar…).
 * Adds CollectionEvent and ItemTapEvent on top of {@link ComponentEvents}.
 */
export interface GroupEvents extends ComponentEvents {
	[CollectionEvent.COLLECTION_CHANGE]: CollectionEvent;
	[ItemTapEvent.ITEM_TAP]: ItemTapEvent;
}

/**
 * Group is the base container for UI components.
 * It participates in the invalidation/validation layout cycle and
 * delegates child positioning to a pluggable LayoutBase instance.
 */
export class Group extends Sprite implements IUIComponent, IViewport, ILayoutTarget, IUIOwner {
	// ── Instance fields ───────────────────────────────────────────────────

	public readonly ui: UIState;

	private _layout?: LayoutBase;
	private _contentWidth = 0;
	private _contentHeight = 0;
	private _scrollEnabled = false;
	private _scrollH = 0;
	private _scrollV = 0;
	private _touchThrough = false;
	private _states: State[] = [];
	private _statesMap: Record<string, State> = {};
	private _currentState = '';
	private _oldState = '';
	private _explicitState = '';
	private _stateIsDirty = false;
	private _stateInitialized = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.ui = new UIState(this);
		this.touchEnabled = true;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get layout(): LayoutBase | undefined {
		return this._layout;
	}

	public set layout(value: LayoutBase | undefined) {
		if (this._layout === value) return;
		if (this._layout) this._layout.target = undefined;
		this._layout = value;
		if (value) value.target = this;
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	public get contentWidth(): number {
		return this._contentWidth;
	}

	public get contentHeight(): number {
		return this._contentHeight;
	}

	public get scrollEnabled(): boolean {
		return this._scrollEnabled;
	}

	public set scrollEnabled(value: boolean) {
		value = !!value;
		if (this._scrollEnabled === value) return;
		this._scrollEnabled = value;
		this._updateScrollRect();
	}

	public get scrollH(): number {
		return this._scrollH;
	}

	public set scrollH(value: number) {
		value = +value || 0;
		if (this._scrollH === value) return;
		this._scrollH = value;
		if (this._updateScrollRect() && this._layout) {
			this._layout.scrollPositionChanged();
		}
		PropertyEvent.dispatchPropertyEvent(this, 'scrollH');
	}

	public get scrollV(): number {
		return this._scrollV;
	}

	public set scrollV(value: number) {
		value = +value || 0;
		if (this._scrollV === value) return;
		this._scrollV = value;
		if (this._updateScrollRect() && this._layout) {
			this._layout.scrollPositionChanged();
		}
		PropertyEvent.dispatchPropertyEvent(this, 'scrollV');
	}

	public get touchThrough(): boolean {
		return this._touchThrough;
	}

	public set touchThrough(value: boolean) {
		this._touchThrough = !!value;
	}

	public get states(): State[] {
		return this._states;
	}

	public set states(value: State[]) {
		if (!value) value = [];
		this._states = value;
		this._statesMap = {};
		for (const state of value) {
			this._statesMap[state.name] = state;
		}
		if (this._stateInitialized) {
			this._commitCurrentState();
		}
	}

	public get currentState(): string {
		return this._currentState;
	}

	public set currentState(value: string) {
		this._explicitState = value;
		this._currentState = value;
		this._commitCurrentState();
	}

	public get numElements(): number {
		return this.numChildren;
	}

	public get includeInLayout(): boolean {
		return this.ui.includeInLayout;
	}

	public set includeInLayout(v: boolean) {
		this.ui.includeInLayout = v;
	}

	public get left(): number | string {
		return this.ui.left;
	}

	public set left(v: number | string) {
		this.ui.left = v;
	}

	public get right(): number | string {
		return this.ui.right;
	}

	public set right(v: number | string) {
		this.ui.right = v;
	}

	public get top(): number | string {
		return this.ui.top;
	}

	public set top(v: number | string) {
		this.ui.top = v;
	}

	public get bottom(): number | string {
		return this.ui.bottom;
	}

	public set bottom(v: number | string) {
		this.ui.bottom = v;
	}

	public get horizontalCenter(): number | string {
		return this.ui.horizontalCenter;
	}

	public set horizontalCenter(v: number | string) {
		this.ui.horizontalCenter = v;
	}

	public get verticalCenter(): number | string {
		return this.ui.verticalCenter;
	}

	public set verticalCenter(v: number | string) {
		this.ui.verticalCenter = v;
	}

	public get percentWidth(): number {
		return this.ui.percentWidth;
	}

	public set percentWidth(v: number) {
		this.ui.percentWidth = v;
	}

	public get percentHeight(): number {
		return this.ui.percentHeight;
	}

	public set percentHeight(v: number) {
		this.ui.percentHeight = v;
	}

	public override $updateUseTransform(): void {
		super.$updateUseTransform();
		this.ui.$invalidateParentLayout();
	}

	public override $setMatrix(matrix: Matrix, needUpdateProperties = true): void {
		super.$setMatrix(matrix, needUpdateProperties);
		this.ui.$invalidateParentLayout();
	}

	public override $setAnchorOffsetX(value: number): void {
		if (this.$anchorOffsetX === value) return;
		super.$setAnchorOffsetX(value);
		this.ui.$invalidateParentLayout();
	}

	public override $setAnchorOffsetY(value: number): void {
		if (this.$anchorOffsetY === value) return;
		super.$setAnchorOffsetY(value);
		this.ui.$invalidateParentLayout();
	}

	public override $setX(value: number): boolean {
		const changed = super.$setX(value);
		if (changed) {
			this.ui.$invalidateParentLayout();
			this.invalidateProperties();
		}
		return changed;
	}

	public override $setY(value: number): boolean {
		const changed = super.$setY(value);
		if (changed) {
			this.ui.$invalidateParentLayout();
			this.invalidateProperties();
		}
		return changed;
	}

	public override get width(): number {
		return this.ui.getWidth();
	}

	public override set width(v: number) {
		this.ui.setWidth(v);
	}

	public override get height(): number {
		return this.ui.getHeight();
	}

	public override set height(v: number) {
		this.ui.setHeight(v);
	}

	public get minWidth(): number {
		return this.ui.minWidth;
	}

	public set minWidth(v: number) {
		this.ui.minWidth = v;
	}

	public get maxWidth(): number {
		return this.ui.maxWidth;
	}

	public set maxWidth(v: number) {
		this.ui.maxWidth = v;
	}

	public get minHeight(): number {
		return this.ui.minHeight;
	}

	public set minHeight(v: number) {
		this.ui.minHeight = v;
	}

	public get maxHeight(): number {
		return this.ui.maxHeight;
	}

	public set maxHeight(v: number) {
		this.ui.maxHeight = v;
	}

	// ── Public methods ────────────────────────────────────────────────────

	public setContentSize(w: number, h: number): void {
		w = Math.ceil(+w || 0);
		h = Math.ceil(+h || 0);
		const wChanged = this._contentWidth !== w;
		const hChanged = this._contentHeight !== h;
		if (!wChanged && !hChanged) return;
		this._contentWidth = w;
		this._contentHeight = h;
		if (wChanged) {
			PropertyEvent.dispatchPropertyEvent(this, 'contentWidth');
		}
		if (hChanged) {
			PropertyEvent.dispatchPropertyEvent(this, 'contentHeight');
		}
	}

	public getElementAt(index: number): DisplayObject | undefined {
		return this.getChildAt(index);
	}

	public getVirtualElementAt(index: number): DisplayObject | undefined {
		return this.getElementAt(index);
	}

	public setVirtualElementIndicesInView(_startIndex: number, _endIndex: number): void {
		// no-op in base Group; overridden by virtual-layout containers
	}

	public set elementsContent(value: DisplayObject[]) {
		if (!value) return;
		for (let i = 0; i < value.length; i++) {
			this.addChild(value[i]);
		}
	}

	public hasState(stateName: string): boolean {
		return !!this._statesMap[stateName];
	}

	public invalidateState(): void {
		if (this._stateIsDirty) return;
		this._stateIsDirty = true;
		this.invalidateProperties();
	}

	public setMeasuredSize(w: number, h: number): void {
		this.ui.setMeasuredSize(w, h);
	}

	public invalidateProperties(): void {
		this.ui.invalidateProperties();
	}

	public validateProperties(): void {
		this.ui.validateProperties();
	}

	public invalidateSize(): void {
		this.ui.invalidateSize();
	}

	public validateSize(recursive?: boolean): void {
		this.ui.validateSize(recursive);
	}

	public invalidateDisplayList(): void {
		this.ui.invalidateDisplayList();
	}

	public validateDisplayList(): void {
		this.ui.validateDisplayList();
	}

	public validateNow(): void {
		this.ui.validateNow();
	}

	public setLayoutBoundsSize(lw: number, lh: number): void {
		this.ui.setLayoutBoundsSize(lw, lh);
	}

	public setLayoutBoundsPosition(x: number, y: number): void {
		this.ui.setLayoutBoundsPosition(x, y);
	}

	public getLayoutBounds(bounds: Rectangle): void {
		this.ui.getLayoutBounds(bounds);
	}

	public getPreferredBounds(bounds: Rectangle): void {
		this.ui.getPreferredBounds(bounds);
	}

	// ── Override methods ──────────────────────────────────────────────────

	public override $onAddToStage(stage: unknown, $nestLevel: number): void {
		super.$onAddToStage(stage as never, $nestLevel);
		this.ui.$onAddToStage();
	}

	public override $hitTest(stageX: number, stageY: number): DisplayObject | undefined {
		if (!this.visible || (!this.touchEnabled && !this.touchChildren) || this.scaleX === 0 || this.scaleY === 0) {
			return undefined;
		}
		const target = super.$hitTest(stageX, stageY);
		if (target || this._touchThrough) return target;
		const point = this.globalToLocal(stageX, stageY, new Point());
		const bounds = new Rectangle(0, 0, this.width, this.height);
		if (this.scrollRect) {
			bounds.x = this.scrollRect.x;
			bounds.y = this.scrollRect.y;
		}
		if (bounds.contains(point.x, point.y)) return this;
		return undefined;
	}

	public override childAdded(child: unknown, index: number): void {
		super.childAdded(child as never, index);
		this.invalidateSize();
		this.invalidateDisplayList();
		if (this._layout) this._layout.elementAdded(index);
	}

	public override childRemoved(child: unknown, index: number): void {
		super.childRemoved(child as never, index);
		this.invalidateSize();
		this.invalidateDisplayList();
		if (this._layout) this._layout.elementRemoved(index);
	}

	// Overload 1: type-safe path for events declared in GroupEvents
	public override addEventListener<K extends keyof GroupEvents & string>(
		type: K,
		listener: (event: GroupEvents[K]) => void,
		useCapture?: boolean,
		priority?: number,
	): void;
	// Overload 2: fallback for arbitrary type strings
	public override addEventListener(
		type: string,
		listener: (event: Event) => void,
		useCapture?: boolean,
		priority?: number,
	): void;
	public override addEventListener(
		type: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		listener: (event: any) => void,
		useCapture?: boolean,
		priority?: number,
	): void {
		super.addEventListener(type, listener, useCapture, priority);
	}

	// Overload 1: type-safe path
	public override removeEventListener<K extends keyof GroupEvents & string>(
		type: K,
		listener: (event: GroupEvents[K]) => void,
		useCapture?: boolean,
	): void;
	// Overload 2: fallback
	public override removeEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean): void;
	public override removeEventListener(
		type: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		listener: (event: any) => void,
		useCapture?: boolean,
	): void {
		super.removeEventListener(type, listener, useCapture);
	}

	// ── IUIOwner lifecycle ────────────────────────────────────────────────

	public createChildren(): void {
		if (!this._layout) {
			this.layout = new BasicLayout();
		}
		this._initializeStates();
	}

	public childrenCreated(): void {}

	public commitProperties(): void {
		this.ui.onCommitProperties();
		if (this._stateIsDirty) {
			this._stateIsDirty = false;
			if (!this._explicitState) {
				this._currentState = this.getCurrentState();
				this._commitCurrentState();
			}
		}
	}

	public measure(): void {
		if (this._layout) {
			this._layout.measure();
		} else {
			this.setMeasuredSize(0, 0);
		}
	}

	public updateDisplayList(w: number, h: number): void {
		if (this._layout) {
			this._layout.updateDisplayList(w, h);
		}
		this._updateScrollRect();
	}

	// ── Protected methods ─────────────────────────────────────────────────

	protected getCurrentState(): string {
		return '';
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _updateScrollRect(): boolean {
		if (this._scrollEnabled) {
			this.scrollRect = new Rectangle(this._scrollH, this._scrollV, this.width, this.height);
		} else if (this.scrollRect) {
			this.scrollRect = undefined;
		}
		return this._scrollEnabled;
	}

	private _commitCurrentState(): void {
		if (!this._stateInitialized) return;
		const destination = this._statesMap[this._currentState];
		if (!destination) {
			if (this._states.length > 0) {
				this._currentState = this._states[0].name;
			} else {
				return;
			}
		}
		if (this._oldState === this._currentState) return;

		const oldStateObj = this._statesMap[this._oldState];
		if (oldStateObj) {
			for (const o of oldStateObj.overrides) {
				o.remove(this as unknown as Component, this as unknown as Skin);
			}
		}

		this._oldState = this._currentState;

		const newStateObj = this._statesMap[this._currentState];
		if (newStateObj) {
			for (const o of newStateObj.overrides) {
				o.apply(this as unknown as Component, this as unknown as Skin);
			}
		}
	}

	private _initializeStates(): void {
		this._stateInitialized = true;
		this._commitCurrentState();
	}
}

export { isUIComponent };
