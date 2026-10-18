import { Sprite, Rectangle, Point, DisplayObject, Event, type DisplayObjectEvents, type Matrix } from '@kurot/core';
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

	/**
	 * Layout instance, initially undefined. First initialization installs BasicLayout
	 * if none was assigned. Replacement detaches the old layout's target and attaches
	 * the new one; do not share one layout instance between simultaneous groups.
	 */
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

	/**
	 * Measured content extent in logical pixels, initially 0. This can exceed the
	 * viewport width; it is maintained by the layout via setContentSize().
	 */
	public get contentWidth(): number {
		return this._contentWidth;
	}

	/**
	 * Measured content extent in logical pixels, initially 0. This can exceed the
	 * viewport height; it is maintained by the layout via setContentSize().
	 */
	public get contentHeight(): number {
		return this._contentHeight;
	}

	/**
	 * Whether to apply the scrolling clip rectangle; defaults to false. Scroller
	 * manages this for its viewport. Enabling clipping does not add drag handling.
	 */
	public get scrollEnabled(): boolean {
		return this._scrollEnabled;
	}

	public set scrollEnabled(value: boolean) {
		value = !!value;
		if (this._scrollEnabled === value) return;
		this._scrollEnabled = value;
		this._updateScrollRect();
	}

	/**
	 * Horizontal content offset in logical pixels, initially 0. Assignment does not
	 * clamp to content bounds. Clipping requires scrollEnabled; Scroller supplies
	 * bounded touch/inertia behavior.
	 */
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

	/**
	 * Vertical content offset in logical pixels, initially 0. Assignment does not
	 * clamp to content bounds. This is a pixel offset, not an item index.
	 */
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

	/**
	 * Whether empty areas pass hit testing through the group; defaults to false.
	 * Children remain independently hittable when this is true.
	 */
	public get touchThrough(): boolean {
		return this._touchThrough;
	}

	public set touchThrough(value: boolean) {
		this._touchThrough = !!value;
	}

	/**
	 * Authored state array, initially empty and retained by reference. Assign again
	 * after changing its membership so the state-name map is rebuilt.
	 */
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

	/**
	 * Requested view state, initially an empty string. After state initialization,
	 * an unknown state falls back to the first defined state instead of throwing.
	 */
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

	/**
	 * Whether the parent layout measures and positions this element; defaults to
	 * true. Setting false does not hide it, disable input or stop its callbacks.
	 */
	public get includeInLayout(): boolean {
		return this.ui.includeInLayout;
	}

	public set includeInLayout(v: boolean) {
		this.ui.includeInLayout = v;
	}

	/**
	 * Left-edge layout constraint: logical pixels, or a percentage string interpreted
	 * by the parent layout. NaN (default) means unset; BasicLayout supports percentages.
	 */
	public get left(): number | string {
		return this.ui.left;
	}

	public set left(v: number | string) {
		this.ui.left = v;
	}

	/**
	 * Right-edge layout constraint in logical pixels or a percentage string; defaults
	 * to NaN (unset). BasicLayout stretches width when both left and right are set.
	 */
	public get right(): number | string {
		return this.ui.right;
	}

	public set right(v: number | string) {
		this.ui.right = v;
	}

	/**
	 * Top-edge layout constraint in logical pixels or a percentage string; defaults
	 * to NaN (unset). Interpretation is supplied by the parent layout.
	 */
	public get top(): number | string {
		return this.ui.top;
	}

	public set top(v: number | string) {
		this.ui.top = v;
	}

	/**
	 * Bottom-edge layout constraint in logical pixels or a percentage string; defaults
	 * to NaN (unset). BasicLayout stretches height when both top and bottom are set.
	 */
	public get bottom(): number | string {
		return this.ui.bottom;
	}

	public set bottom(v: number | string) {
		this.ui.bottom = v;
	}

	/**
	 * Horizontal center offset in logical pixels, or a percentage string; defaults
	 * to NaN (unset). BasicLayout measures percentage offsets against half the parent
	 * width, with 0 centering the element.
	 */
	public get horizontalCenter(): number | string {
		return this.ui.horizontalCenter;
	}

	public set horizontalCenter(v: number | string) {
		this.ui.horizontalCenter = v;
	}

	/**
	 * Vertical center offset in logical pixels, or a percentage string; defaults to
	 * NaN (unset). BasicLayout measures percentage offsets against half the parent
	 * height, with 0 centering the element.
	 */
	public get verticalCenter(): number | string {
		return this.ui.verticalCenter;
	}

	public set verticalCenter(v: number | string) {
		this.ui.verticalCenter = v;
	}

	/**
	 * Requested percentage of parent width; 100 means full width, not 1. Defaults
	 * to NaN (automatic). BasicLayout gives paired edge constraints precedence.
	 */
	public get percentWidth(): number {
		return this.ui.percentWidth;
	}

	public set percentWidth(v: number) {
		this.ui.percentWidth = v;
	}

	/**
	 * Requested percentage of parent height; 100 means full height, not 1. Defaults
	 * to NaN (automatic). BasicLayout gives paired edge constraints precedence.
	 */
	public get percentHeight(): number {
		return this.ui.percentHeight;
	}

	public set percentHeight(v: number) {
		this.ui.percentHeight = v;
	}

	public override $getFlipBounds(bounds: Rectangle): void {
		this.ui.getActualBounds(bounds);
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

	/**
	 * Current unscaled UI width in logical pixels. Explicit width starts as NaN
	 * (automatic measurement); assigning NaN restores automatic sizing. Parent layout
	 * constraints may allocate a different size. Reading can validate pending size.
	 */
	public override get width(): number {
		return this.ui.getWidth();
	}

	public override set width(v: number) {
		this.ui.setWidth(v);
	}

	/**
	 * Current unscaled UI height in logical pixels. Explicit height starts as NaN
	 * (automatic measurement); assigning NaN restores automatic sizing. Parent layout
	 * constraints may allocate a different size. Reading can validate pending size.
	 */
	public override get height(): number {
		return this.ui.getHeight();
	}

	public override set height(v: number) {
		this.ui.setHeight(v);
	}

	/**
	 * Minimum unscaled layout width in logical pixels; defaults to 0.
	 */
	public get minWidth(): number {
		return this.ui.minWidth;
	}

	public set minWidth(v: number) {
		this.ui.minWidth = v;
	}

	/**
	 * Maximum unscaled layout width in logical pixels; defaults to 100000.
	 */
	public get maxWidth(): number {
		return this.ui.maxWidth;
	}

	public set maxWidth(v: number) {
		this.ui.maxWidth = v;
	}

	/**
	 * Minimum unscaled layout height in logical pixels; defaults to 0.
	 */
	public get minHeight(): number {
		return this.ui.minHeight;
	}

	public set minHeight(v: number) {
		this.ui.minHeight = v;
	}

	/**
	 * Maximum unscaled layout height in logical pixels; defaults to 100000.
	 */
	public get maxHeight(): number {
		return this.ui.maxHeight;
	}

	public set maxHeight(v: number) {
		this.ui.maxHeight = v;
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Set content extents in logical pixels, rounding up and dispatching property
	 * change notifications. Layouts call this; viewport width/height are unchanged.
	 */
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

	/**
	 * Return the direct child at a 0-based index, or undefined when absent.
	 * DataGroup specializes this for logical item indices.
	 */
	public getElementAt(index: number): DisplayObject | undefined {
		return this.getChildAt(index);
	}

	/**
	 * For a plain Group, return getChildAt(index) without creating anything.
	 * Virtualized DataGroup can instead materialize a renderer for a logical index.
	 */
	public getVirtualElementAt(index: number): DisplayObject | undefined {
		return this.getElementAt(index);
	}

	public setVirtualElementIndicesInView(_startIndex: number, _endIndex: number): void {
		// no-op in base Group; overridden by virtual-layout containers
	}

	/**
	 * Add/reparent these display children in order. This setter appends to existing
	 * children; it does not replace or dispose the previous contents. Remove old
	 * children explicitly and release their application-owned resources separately.
	 */
	public set elementsContent(value: DisplayObject[]) {
		if (!value) return;
		for (let i = 0; i < value.length; i++) {
			this.addChild(value[i]);
		}
	}

	/**
	 * Whether a state name exists. Missing names return false rather than throwing.
	 */
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

	/**
	 * Queue a deferred commitProperties() pass. Repeated invalidations coalesce;
	 * this does not synchronously commit or schedule application game logic.
	 */
	public invalidateProperties(): void {
		this.ui.invalidateProperties();
	}

	public validateProperties(): void {
		this.ui.validateProperties();
	}

	/**
	 * Queue deferred measurement and parent layout updates. Use validateNow() after
	 * attachment if code must read the resulting UI layout synchronously.
	 */
	public invalidateSize(): void {
		this.ui.invalidateSize();
	}

	public validateSize(recursive?: boolean): void {
		this.ui.validateSize(recursive);
	}

	/**
	 * Queue a deferred layout/redraw pass using the current unscaled UI size.
	 */
	public invalidateDisplayList(): void {
		this.ui.invalidateDisplayList();
	}

	public validateDisplayList(): void {
		this.ui.validateDisplayList();
	}

	/**
	 * Synchronously validate this UI subtree when attached to a stage. Does nothing
	 * off-stage; it is not an initialization or disposal method.
	 */
	public validateNow(): void {
		this.ui.validateNow();
	}

	/**
	 * Allocate parent-space layout width/height in logical pixels, accounting for
	 * transforms and size constraints. NaN selects the preferred size on that axis;
	 * negative dimensions cause the request to be ignored. Normally called by layouts.
	 */
	public setLayoutBoundsSize(lw: number, lh: number): void {
		this.ui.setLayoutBoundsSize(lw, lh);
	}

	/**
	 * Position the element's transformed layout bounds at parent-space logical
	 * coordinates, accounting for its anchor. Normally called by layouts.
	 */
	public setLayoutBoundsPosition(x: number, y: number): void {
		this.ui.setLayoutBoundsPosition(x, y);
	}

	/**
	 * Write current transformed layout bounds in parent-space logical pixels into
	 * the caller's Rectangle. The rectangle is reused, not retained.
	 */
	public getLayoutBounds(bounds: Rectangle): void {
		this.ui.getLayoutBounds(bounds);
	}

	/**
	 * Write preferred (explicit or measured) transformed bounds in parent-space
	 * logical pixels into the caller's Rectangle, before parent size allocation.
	 */
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
