import { Sprite, Rectangle, Event, type DisplayObject, type DisplayObjectEvents, type Matrix } from '@kurot/core';
import { UIState, isUIComponent } from '../core/UIState.js';
import type { IUIOwner } from '../core/UIState.js';
import { BasicLayout } from '../layouts/BasicLayout.js';
import { getTheme } from '../core/Theme.js';
import type { IUIComponent } from '../core/IUIComponent.js';
import type { ILayoutTarget } from '../layouts/ILayoutTarget.js';
import type { Skin } from './Skin.js';
import { PropertyEvent } from '../events/PropertyEvent.js';
import { UIEvent } from '../events/UIEvent.js';

/**
 * EventMap for Component and all its subclasses.
 * Extends DisplayObjectEvents with the UI-layer event types that
 * skinnable components dispatch.
 */
export interface ComponentEvents extends DisplayObjectEvents {
	[PropertyEvent.PROPERTY_CHANGE]: PropertyEvent;
	[UIEvent.CREATION_COMPLETE]: UIEvent;
	[UIEvent.CHANGE_START]: UIEvent;
	[UIEvent.CHANGE_END]: UIEvent;
	[UIEvent.CLOSING]: UIEvent;
	[UIEvent.MOVE]: UIEvent;
}

/**
 * Project-generated skin part declarations augment this interface.
 *
 * Each key is a skin class name and each value is the exact set of parts
 * exported by that skin.
 */
export interface SkinPartsMap {}

/**
 * Resolve the generated skin parts for a skin class name.
 */
export type SkinPartsOf<TSkin extends string> = TSkin extends keyof SkinPartsMap
	? SkinPartsMap[TSkin]
	: Readonly<Record<string, unknown>>;

/**
 * Base class for all skinnable UI components.
 *
 * Subclasses should:
 * 1. Override `getCurrentState()` to return the current view-state name.
 * 2. Override `onSkinReady()` for setup that needs the complete skin.
 * 3. Override `onSkinRemoved()` to clean up complete-skin bindings.
 * 4. Override `createChildren()` to perform one-time initialization.
 */
export class Component<TSkin extends string = string> extends Sprite implements IUIComponent, ILayoutTarget, IUIOwner {
	// ── Instance fields ───────────────────────────────────────────────────

	public readonly ui: UIState;
	public skinNameExplicitlySet = false;

	private _hostComponentKey?: string;
	private _skinName?: string | (new () => Skin) | Skin;
	private _skin?: Skin;
	private _enabled = true;
	private _explicitTouchEnabled = true;
	private _explicitTouchChildren = true;
	private _explicitState = '';
	private _stateIsDirty = false;
	private _skinReady = false;
	private _skinParts: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor() {
		super();
		this.ui = new UIState(this);
		this.touchEnabled = true;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	/**
	 * Key used to look up the default skin in the active Theme.
	 * Defaults to the component's class name if not set.
	 */
	public get hostComponentKey(): string {
		return this._hostComponentKey ?? (this.constructor as { name?: string }).name ?? '';
	}

	public set hostComponentKey(value: string) {
		this._hostComponentKey = value;
	}

	/**
	 * Skin constructor, instance or global class-name string, initially undefined.
	 * A missing global name clears the attached skin rather than throwing; exceptions
	 * from a supplied factory propagate. Assigning undefined detaches the skin.
	 * Replacement invokes skin cleanup hooks, but stage removal alone retains the skin.
	 */
	public get skinName(): string | (new () => Skin) | Skin | undefined {
		return this._skinName;
	}

	public set skinName(value: string | (new () => Skin) | Skin | undefined) {
		this.skinNameExplicitlySet = true;
		if (this._skinName === value) return;
		this._skinName = value;
		this._parseSkinName();
	}

	/**
	 * Currently attached skin, or undefined. Skin replacement detaches old visuals
	 * and tracked skin watchers; removing the component from the stage retains its
	 * skin. The game still owns its manual listeners, timers and bindings.
	 */
	public get skin(): Skin | undefined {
		return this._skin;
	}

	/**
	 * Whether this component accepts input; defaults to true. Disabling immediately
	 * suppresses touchEnabled/touchChildren and invalidates the skin state; re-enabling
	 * restores requested flags. This does not stop game callbacks, timers or tweens.
	 */
	public get enabled(): boolean {
		return this._enabled;
	}

	/**
	 * Enable or disable this component (and its children).
	 *
	 * Mirrors egret's `$setEnabled`: writes `touchEnabled` / `touchChildren`
	 * directly at the display-object level (via `super`) so that:
	 *
	 * 1. The display-layer values change immediately (disabled components are
	 *    skipped in hit-testing, just like egret).
	 * 2. `_explicitTouchEnabled` / `_explicitTouchChildren` survive the
	 *    disable→enable cycle so the original intent is restored on re-enable.
	 */
	public set enabled(value: boolean) {
		value = !!value;
		if (this._enabled === value) return;
		this._enabled = value;
		if (value) {
			super.touchEnabled = this._explicitTouchEnabled;
			super.touchChildren = this._explicitTouchChildren;
		} else {
			super.touchEnabled = false;
			super.touchChildren = false;
		}
		this.invalidateState();
	}

	/**
	 * The current view state. Setting this explicitly overrides `getCurrentState()`.
	 * Set to `''` to revert to the computed state.
	 */
	public get currentState(): string {
		return this._explicitState || this.getCurrentState();
	}

	public set currentState(value: string) {
		if (this._explicitState === value) return;
		this._explicitState = value;
		this.invalidateState();
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

	public get numElements(): number {
		return this.numChildren;
	}

	public get contentWidth(): number {
		return this.width;
	}

	public get contentHeight(): number {
		return this.height;
	}

	/**
	 * Always 0 for a plain Component; assignment has no effect. Use a Group viewport
	 * inside Scroller for scrollable content.
	 */
	public get scrollH(): number {
		return 0;
	}

	public set scrollH(_v: number) {
		// No-op for Component.
	}

	/**
	 * Always 0 for a plain Component; assignment has no effect. Use a Group viewport
	 * inside Scroller for scrollable content.
	 */
	public get scrollV(): number {
		return 0;
	}

	public set scrollV(_v: number) {
		// No-op for Component.
	}

	/**
	 * Read-only named parts exported by the attached skin. Access before completed
	 * skin attachment throws Error; use onSkinReady() to access the full part set.
	 * Old parts remain available inside onSkinRemoved(), before detachment. Generated
	 * declarations provide exact names/types for known skins.
	 */
	public get skinParts(): Readonly<SkinPartsOf<TSkin>> {
		if (!this._skinReady) {
			throw new Error(`${this.constructor.name} skin parts are not ready.`);
		}
		return this._skinParts as SkinPartsOf<TSkin>;
	}

	// ── Public methods ────────────────────────────────────────────────────

	public _applySkinName(skinName: string): void {
		this._skinName = skinName;
		this._parseSkinName();
		this.invalidateProperties();
	}

	/**
	 * Whether the display object receives touch events.
	 *
	 * Unlike the setter, reading this property always returns the *actual*
	 * display-level value — even when the component is disabled (the setter
	 * deliberately preserves `_explicitTouchEnabled` for the next `enabled`
	 * restore, so the getter must bypass that layer).
	 */
	public override get touchEnabled(): boolean {
		return super.touchEnabled;
	}

	public override set touchEnabled(value: boolean) {
		this._explicitTouchEnabled = value;
		if (this._enabled) super.touchEnabled = value;
	}

	public override get touchChildren(): boolean {
		return super.touchChildren;
	}

	public override set touchChildren(value: boolean) {
		this._explicitTouchChildren = value;
		if (this._enabled) super.touchChildren = value;
	}

	/**
	 * Mark the view state as dirty so it will be re-applied on next commit.
	 */
	public invalidateState(): void {
		if (this._stateIsDirty) return;
		this._stateIsDirty = true;
		this.invalidateProperties();
	}

	public getElementAt(index: number): DisplayObject | undefined {
		return this.getChildAt(index);
	}

	public getVirtualElementAt(index: number): DisplayObject | undefined {
		return this.getChildAt(index);
	}

	public setVirtualElementIndicesInView(_startIndex: number, _endIndex: number): void {
		// No-op for Component.
	}

	public setContentSize(_w: number, _h: number): void {}

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

	public override childAdded(_child: unknown, _index: number): void {
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	public override childRemoved(_child: unknown, _index: number): void {
		this.invalidateSize();
		this.invalidateDisplayList();
	}

	// Overload 1: type-safe path for events declared in ComponentEvents
	public override addEventListener<K extends keyof ComponentEvents & string>(
		type: K,
		listener: (event: ComponentEvents[K]) => void,
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
	public override removeEventListener<K extends keyof ComponentEvents & string>(
		type: K,
		listener: (event: ComponentEvents[K]) => void,
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

	/**
	 * One-time initialization hook on first stage attachment. Applies the active
	 * theme's skin when no explicit skin is set. Call super.createChildren() when
	 * overriding; stage reattachment does not call this hook again.
	 */
	public createChildren(): void {
		if (!this._skinName) {
			const theme = getTheme();
			if (theme) {
				const skinName = theme.getSkinName(this);
				if (skinName) this._applySkinName(skinName);
			}
		}
	}

	/**
	 * One-time hook after createChildren() and before CREATION_COMPLETE. It is not
	 * called on every round restart or stage reattachment.
	 */
	public childrenCreated(): void {}

	public commitProperties(): void {
		this.ui.onCommitProperties();
		if (this._stateIsDirty) {
			this._stateIsDirty = false;
			if (this._skin) this._skin.currentState = this.currentState;
		}
	}

	public measure(): void {
		_basicLayout.target = this;
		_basicLayout.measure();
		_basicLayout.target = undefined;

		const skin = this._skin;
		if (!skin) return;

		const bounds = new Rectangle();
		this.ui.getUnscaledPreferredBounds(bounds);
		let mw = bounds.width;
		let mh = bounds.height;

		if (!isNaN(skin.width)) {
			mw = skin.width;
		} else {
			mw = Math.max(Math.min(mw, skin.maxWidth), skin.minWidth);
		}
		if (!isNaN(skin.height)) {
			mh = skin.height;
		} else {
			mh = Math.max(Math.min(mh, skin.maxHeight), skin.minHeight);
		}
		this.setMeasuredSize(mw, mh);
	}

	public updateDisplayList(w: number, h: number): void {
		_basicLayout.target = this;
		_basicLayout.updateDisplayList(w, h);
		_basicLayout.target = undefined;
	}

	// ── Protected methods ─────────────────────────────────────────────────

	/**
	 * Whether all parts for the current skin have been attached.
	 */
	protected get skinReady(): boolean {
		return this._skinReady;
	}

	protected setSkin(skin: Skin | undefined): void {
		this._setSkin(skin);
	}

	/**
	 * Called after the complete skin and all of its parts have been attached.
	 */
	protected onSkinReady(): void {}

	/**
	 * Called before the current skin and complete part set are detached/replaced.
	 * Release listeners/bindings installed by onSkinReady() here. Merely removing the
	 * component from the stage does not call this hook; application round resources
	 * need their own cleanup path.
	 */
	protected onSkinRemoved(): void {}

	/**
	 * Return the current view-state name. Override in subclasses.
	 */
	protected getCurrentState(): string {
		return this._enabled ? '' : 'disabled';
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _parseSkinName(): void {
		const skinName = this._skinName;
		let skin: Skin | undefined;
		if (skinName) {
			if (typeof skinName === 'function') {
				skin = this._invokeSkinFactory(skinName as new () => Skin);
			} else if (typeof skinName === 'string') {
				const clazz = (globalThis as Record<string, unknown>)[skinName] as ((new () => Skin) | ((thisArg: unknown) => Skin)) | undefined;
				if (clazz) skin = this._invokeSkinFactory(clazz);
			} else {
				skin = skinName as Skin;
			}
		}
		this._setSkin(skin);
		// Generated factories run with the component as their receiver so future
		// host-aware skin setup can use the same stable invocation contract.
	}

	/**
	 * Invoke a skin factory function with `this` (the host component) as context.
	 *
	 * KUI-compiled skins are factory functions rather than class constructors.
	 * Calling with `.call(this)` supplies the host component to host-aware setup.
	 *
	 * For genuine ES class constructors (e.g. a user-written `class MySkin extends Skin`),
	 * `.call(this)` would throw `TypeError: Class constructor cannot be invoked without
	 * 'new'`, so we detect class constructors by their string representation and use `new`
	 * instead.
	 */
	private _invokeSkinFactory(factory: (new () => Skin) | ((thisArg: unknown) => Skin)): Skin | undefined {
		const fn = factory as (...args: unknown[]) => unknown;

		// Detect genuine class constructors: `Function.prototype.toString()` returns
		// a string starting with "class" for ES classes. Plain functions never do.
		const isClass = typeof fn === 'function' && /^class\s/.test(Function.prototype.toString.call(fn));

		const result = isClass ? new (factory as new () => Skin)() : fn.call(this);
		return (result && typeof result === 'object' && 'skinParts' in result) ? (result as Skin) : undefined;
	}

	private _setSkin(skin: Skin | undefined): void {
		const oldSkin = this._skin;
		if (oldSkin) {
			// Exit the active state while its host and display hierarchy are still
			// intact, then detach bindings, parts and visual elements.
			if (this._skinReady) {
				this.onSkinRemoved();
				this._skinReady = false;
			}
			this._skinParts = Object.create(null) as Record<string, unknown>;
			oldSkin.hostComponent = undefined;
			oldSkin.unwatchAll();
			for (const child of oldSkin.elementsContent) {
				if (child.parent === this) this.removeChild(child);
			}
		}
		this._skin = skin;
		if (skin) {
			const parts = Object.create(null) as Record<string, unknown>;
			for (const partName of skin.skinParts) {
				const instance = skin.getPart(partName);
				if (instance !== undefined) parts[partName] = instance;
			}
			this._skinParts = parts;
			for (let i = skin.elementsContent.length - 1; i >= 0; i--) {
				this.addChildAt(skin.elementsContent[i], 0);
			}
			skin.currentState = this.currentState;
			skin.hostComponent = this;
			this._skinReady = true;
			this.onSkinReady();
		}
		this.invalidateSize();
		this.invalidateDisplayList();
		this.dispatchEventWith(Event.COMPLETE);
	}
}

const _basicLayout = new BasicLayout();

export { isUIComponent };
