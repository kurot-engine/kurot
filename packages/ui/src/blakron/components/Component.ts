import { Sprite, Rectangle, Event, type DisplayObject, type DisplayObjectEvents, type Matrix } from '@blakron/core';
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
 * Base class for all skinnable UI components.
 *
 * Subclasses should:
 * 1. Override `getCurrentState()` to return the current view-state name.
 * 2. Override `partAdded()` to bind skin parts to component logic.
 * 3. Override `partRemoved()` to clean up skin part bindings.
 * 4. Override `createChildren()` to perform one-time initialization.
 */
export class Component extends Sprite implements IUIComponent, ILayoutTarget, IUIOwner {
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
	 * Skin identifier. Can be:
	 * - A Skin subclass constructor
	 * - A Skin instance
	 * - A class name string (resolved via global scope)
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

	public get skin(): Skin | undefined {
		return this._skin;
	}

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

	public get numElements(): number {
		return this.numChildren;
	}

	public get contentWidth(): number {
		return this.width;
	}

	public get contentHeight(): number {
		return this.height;
	}

	public get scrollH(): number {
		return 0;
	}

	public set scrollH(_v: number) {
		/* no-op for Component */
	}

	public get scrollV(): number {
		return 0;
	}

	public set scrollV(_v: number) {
		/* no-op for Component */
	}

	// ── Public methods ────────────────────────────────────────────────────

	public _applySkinName(skinName: string): void {
		this._skinName = skinName;
		this._parseSkinName();
		this.invalidateProperties();
	}

	/**
	 * Bind a skin part instance to this component.
	 * Called automatically when a skin is attached.
	 */
	public setSkinPart(partName: string, instance: unknown): void {
		const self = this as Record<string, unknown>;
		const old = self[partName];
		if (old) this.partRemoved(partName, old);
		self[partName] = instance;
		if (instance) this.partAdded(partName, instance);
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
		/* no-op for Component */
	}

	public setContentSize(_w: number, _h: number): void {}

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

	public createChildren(): void {
		if (!this._skinName) {
			const theme = getTheme();
			if (theme) {
				const skinName = theme.getSkinName(this);
				if (skinName) this._applySkinName(skinName);
			}
		}
	}

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
		this.getPreferredBounds(bounds);
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

	protected setSkin(skin: Skin | undefined): void {
		this._setSkin(skin);
	}

	/**
	 * Called when a skin part is added. Override to bind event listeners
	 * or apply cached property values to the part.
	 */
	protected partAdded(_partName: string, _instance: unknown): void {}

	/**
	 * Called when a skin part is removed. Override to clean up listeners
	 * and cached references.
	 */
	protected partRemoved(_partName: string, _instance: unknown): void {}

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
		// After the skin is applied, bind any deferred watchers so that
		// Binding.bindProperty(this, ...) calls inside the factory resolve `this`
		// to this component.
	}

	/**
	 * Invoke a skin factory function with `this` (the host component) as context.
	 *
	 * EXML-compiled skins are factory functions (not class constructors) that use
	 * `this` for `Binding.bindProperty(this, ...)`. Calling with `.call(this)` ensures
	 * the bindings watch the host component, not a `new`-target blank object.
	 *
	 * For genuine ES class constructors (e.g. a user-written `class MySkin extends Skin`),
	 * `.call(this)` would throw `TypeError: Class constructor cannot be invoked without
	 * 'new'`, so we detect class constructors by their string representation and use `new`
	 * instead. This secondary path never has correct binding-`this`, so user skins should
	 * always be factory functions when they contain EXML `{…}` bindings.
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
			oldSkin.hostComponent = undefined;
			oldSkin.unwatchAll();
			for (const partName of oldSkin.skinParts) {
				if ((this as Record<string, unknown>)[partName]) this.setSkinPart(partName, undefined);
			}
			for (const child of oldSkin.elementsContent) {
				if (child.parent === this) this.removeChild(child);
			}
		}
		this._skin = skin;
		if (skin) {
			for (const partName of skin.skinParts) {
				const instance = skin.getPart(partName);
				if (instance) this.setSkinPart(partName, instance);
			}
			for (let i = skin.elementsContent.length - 1; i >= 0; i--) {
				this.addChildAt(skin.elementsContent[i], 0);
			}
			skin.hostComponent = this;
		}
		this.invalidateSize();
		this.invalidateDisplayList();
		this.dispatchEventWith(Event.COMPLETE);
	}
}

const _basicLayout = new BasicLayout();

export { isUIComponent };
