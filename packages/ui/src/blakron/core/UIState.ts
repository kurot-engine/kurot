import { DisplayObject, DisplayObjectContainer, Rectangle, Matrix, Event } from '@blakron/core';
import type { IUIComponent } from './IUIComponent.js';
import { validator } from './Validator.js';
import { UIEvent } from '../events/UIEvent.js';

// ── Internal state keys ───────────────────────────────────────────────────────

const enum K {
	left,
	right,
	top,
	bottom,
	horizontalCenter,
	verticalCenter,
	percentWidth,
	percentHeight,
	$explicitWidth,
	$explicitHeight,
	width,
	height,
	minWidth,
	maxWidth,
	minHeight,
	maxHeight,
	measuredWidth,
	measuredHeight,
	oldPreferWidth,
	oldPreferHeight,
	oldX,
	oldY,
	oldWidth,
	oldHeight,
	invalidatePropertiesFlag,
	invalidateSizeFlag,
	invalidateDisplayListFlag,
	layoutWidthExplicitlySet,
	layoutHeightExplicitlySet,
	initialized,
}

function isDeltaIdentity(m: Matrix): boolean {
	return m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1;
}

/**
 * The interface that UIState requires from its host DisplayObject.
 * Keeps UIState decoupled from any specific DisplayObject subclass.
 */
export interface IUIOwner extends DisplayObject {
	createChildren(): void;
	childrenCreated(): void;
	commitProperties(): void;
	measure(): void;
	updateDisplayList(w: number, h: number): void;
}

/**
 * Encapsulates all UI layout state and logic for a component.
 *
 * Instead of using a mixin, Group and Component each hold a UIState instance
 * and delegate all IUIComponent method calls to it. This keeps the class
 * hierarchy clean and avoids prototype manipulation.
 */
export class UIState {
	// ── Instance fields ───────────────────────────────────────────────────

	private _v: Record<number, number | boolean>;
	private _includeInLayout = true;
	private _owner: IUIOwner;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(owner: IUIOwner) {
		this._owner = owner;
		this._v = {
			[K.left]: NaN,
			[K.right]: NaN,
			[K.top]: NaN,
			[K.bottom]: NaN,
			[K.horizontalCenter]: NaN,
			[K.verticalCenter]: NaN,
			[K.percentWidth]: NaN,
			[K.percentHeight]: NaN,
			[K.$explicitWidth]: NaN,
			[K.$explicitHeight]: NaN,
			[K.width]: 0,
			[K.height]: 0,
			[K.minWidth]: 0,
			[K.maxWidth]: 100000,
			[K.minHeight]: 0,
			[K.maxHeight]: 100000,
			[K.measuredWidth]: 0,
			[K.measuredHeight]: 0,
			[K.oldPreferWidth]: NaN,
			[K.oldPreferHeight]: NaN,
			[K.oldX]: 0,
			[K.oldY]: 0,
			[K.oldWidth]: 0,
			[K.oldHeight]: 0,
			[K.invalidatePropertiesFlag]: true,
			[K.invalidateSizeFlag]: true,
			[K.invalidateDisplayListFlag]: true,
			[K.layoutWidthExplicitlySet]: false,
			[K.layoutHeightExplicitlySet]: false,
			[K.initialized]: false,
		};
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get includeInLayout(): boolean {
		return this._includeInLayout;
	}

	public set includeInLayout(value: boolean) {
		value = !!value;
		if (this._includeInLayout === value) return;
		this._includeInLayout = value;
		this.$invalidateParentLayout();
	}

	public get left(): number | string {
		return this._v[K.left] as number;
	}

	public set left(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this._v[K.left] === v) return;
		this._v[K.left] = v as number;
		this.$invalidateParentLayout();
	}

	public get right(): number | string {
		return this._v[K.right] as number;
	}

	public set right(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this._v[K.right] === v) return;
		this._v[K.right] = v as number;
		this.$invalidateParentLayout();
	}

	public get top(): number | string {
		return this._v[K.top] as number;
	}

	public set top(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this._v[K.top] === v) return;
		this._v[K.top] = v as number;
		this.$invalidateParentLayout();
	}

	public get bottom(): number | string {
		return this._v[K.bottom] as number;
	}

	public set bottom(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this._v[K.bottom] === v) return;
		this._v[K.bottom] = v as number;
		this.$invalidateParentLayout();
	}

	public get horizontalCenter(): number | string {
		return this._v[K.horizontalCenter] as number;
	}

	public set horizontalCenter(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this._v[K.horizontalCenter] === v) return;
		this._v[K.horizontalCenter] = v as number;
		this.$invalidateParentLayout();
	}

	public get verticalCenter(): number | string {
		return this._v[K.verticalCenter] as number;
	}

	public set verticalCenter(value: number | string) {
		const v = typeof value === 'number' || !value ? +value : String(value).trim();
		if (this._v[K.verticalCenter] === v) return;
		this._v[K.verticalCenter] = v as number;
		this.$invalidateParentLayout();
	}

	public get percentWidth(): number {
		return this._v[K.percentWidth] as number;
	}

	public set percentWidth(value: number) {
		value = +value;
		if (this._v[K.percentWidth] === value) return;
		this._v[K.percentWidth] = value;
		this.$invalidateParentLayout();
	}

	public get percentHeight(): number {
		return this._v[K.percentHeight] as number;
	}

	public set percentHeight(value: number) {
		value = +value;
		if (this._v[K.percentHeight] === value) return;
		this._v[K.percentHeight] = value;
		this.$invalidateParentLayout();
	}

	public get $explicitWidth(): number {
		return this._owner.$explicitWidth;
	}

	public get $explicitHeight(): number {
		return this._owner.$explicitHeight;
	}

	public get minWidth(): number {
		return this._v[K.minWidth] as number;
	}

	public set minWidth(value: number) {
		value = +value || 0;
		if (value < 0 || this._v[K.minWidth] === value) return;
		this._v[K.minWidth] = value;
		this.invalidateSize();
		this.$invalidateParentLayout();
	}

	public get maxWidth(): number {
		return this._v[K.maxWidth] as number;
	}

	public set maxWidth(value: number) {
		value = +value || 0;
		if (value < 0 || this._v[K.maxWidth] === value) return;
		this._v[K.maxWidth] = value;
		this.invalidateSize();
		this.$invalidateParentLayout();
	}

	public get minHeight(): number {
		return this._v[K.minHeight] as number;
	}

	public set minHeight(value: number) {
		value = +value || 0;
		if (value < 0 || this._v[K.minHeight] === value) return;
		this._v[K.minHeight] = value;
		this.invalidateSize();
		this.$invalidateParentLayout();
	}

	public get maxHeight(): number {
		return this._v[K.maxHeight] as number;
	}

	public set maxHeight(value: number) {
		value = +value || 0;
		if (value < 0 || this._v[K.maxHeight] === value) return;
		this._v[K.maxHeight] = value;
		this.invalidateSize();
		this.$invalidateParentLayout();
	}

	// ── Public methods ────────────────────────────────────────────────────

	public $onAddToStage(): void {
		this._checkInvalidateFlag();
		const v = this._v;
		if (!v[K.initialized]) {
			v[K.initialized] = true;
			this._owner.createChildren();
			this._owner.childrenCreated();
			UIEvent.dispatchUIEvent(this._owner, UIEvent.CREATION_COMPLETE);
		} else {
			// Re-entering the display list after removal — force a redraw so
			// graphics commands are rebuilt in the WebGL instruction set.
			// Use validateNow() to execute synchronously before the next render
			// phase, avoiding the timing issue where structureDirty fires before
			// the Validator has filled the graphics commands.
			this.invalidateDisplayList();
			if (this._owner.stage) validator.validateClient(this._owner as IUIOwner & IUIComponent);
		}
	}

	public onCommitProperties(): void {
		const v = this._v;
		const owner = this._owner;
		if (v[K.oldWidth] !== v[K.width] || v[K.oldHeight] !== v[K.height]) {
			owner.dispatchEventWith(Event.RESIZE);
			v[K.oldWidth] = v[K.width];
			v[K.oldHeight] = v[K.height];
		}
		if (v[K.oldX] !== owner.x || v[K.oldY] !== owner.y) {
			UIEvent.dispatchUIEvent(owner, UIEvent.MOVE);
			v[K.oldX] = owner.x;
			v[K.oldY] = owner.y;
		}
	}

	public getWidth(): number {
		this._validateSizeNow();
		return this._v[K.width] as number;
	}

	public setWidth(value: number): void {
		value = +value;
		const v = this._v;
		if (value < 0 || (v[K.width] === value && this._owner.$explicitWidth === value)) return;
		this._owner.$explicitWidth = value;
		if (isNaN(value)) this.invalidateSize();
		this.invalidateProperties();
		this.invalidateDisplayList();
		this.$invalidateParentLayout();
	}

	public getHeight(): number {
		this._validateSizeNow();
		return this._v[K.height] as number;
	}

	public setHeight(value: number): void {
		value = +value;
		const v = this._v;
		if (value < 0 || (v[K.height] === value && this._owner.$explicitHeight === value)) return;
		this._owner.$explicitHeight = value;
		if (isNaN(value)) this.invalidateSize();
		this.invalidateProperties();
		this.invalidateDisplayList();
		this.$invalidateParentLayout();
	}

	public setMeasuredSize(width: number, height: number): void {
		this._v[K.measuredWidth] = Math.ceil(+width || 0);
		this._v[K.measuredHeight] = Math.ceil(+height || 0);
	}

	public invalidateProperties(): void {
		const v = this._v;
		if (!v[K.invalidatePropertiesFlag]) {
			v[K.invalidatePropertiesFlag] = true;
			if (this._owner.stage) validator.invalidateProperties(this._owner as IUIOwner & IUIComponent);
		}
	}

	public validateProperties(): void {
		const v = this._v;
		if (v[K.invalidatePropertiesFlag]) {
			this._owner.commitProperties();
			v[K.invalidatePropertiesFlag] = false;
		}
	}

	public invalidateSize(): void {
		const v = this._v;
		if (!v[K.invalidateSizeFlag]) {
			v[K.invalidateSizeFlag] = true;
			if (this._owner.stage) validator.invalidateSize(this._owner as IUIOwner & IUIComponent);
		}
	}

	public validateSize(recursive = false): void {
		if (recursive && this._owner instanceof DisplayObjectContainer) {
			for (let i = 0; i < this._owner.numChildren; i++) {
				const child = this._owner.getChildAt(i);
				if (child && isUIComponent(child)) child.validateSize(true);
			}
		}
		const v = this._v;
		if (v[K.invalidateSizeFlag]) {
			if (this._measureSizes()) {
				this.invalidateDisplayList();
				this.$invalidateParentLayout();
			}
			v[K.invalidateSizeFlag] = false;
		}
	}

	public invalidateDisplayList(): void {
		const v = this._v;
		if (!v[K.invalidateDisplayListFlag]) {
			v[K.invalidateDisplayListFlag] = true;
			if (this._owner.stage) validator.invalidateDisplayList(this._owner as IUIOwner & IUIComponent);
		}
	}

	public validateDisplayList(): void {
		const v = this._v;
		if (v[K.invalidateDisplayListFlag]) {
			this._updateFinalSize();
			this._owner.updateDisplayList(v[K.width] as number, v[K.height] as number);
			v[K.invalidateDisplayListFlag] = false;
		}
	}

	public validateNow(): void {
		if (this._owner.stage) validator.validateClient(this._owner as IUIOwner & IUIComponent);
	}

	public setLayoutBoundsSize(layoutWidth: number, layoutHeight: number): void {
		layoutWidth = +layoutWidth;
		layoutHeight = +layoutHeight;
		if (layoutWidth < 0 || layoutHeight < 0) return;

		const v = this._v;
		const maxW = v[K.maxWidth] as number;
		const maxH = v[K.maxHeight] as number;
		const minW = Math.min(v[K.minWidth] as number, maxW);
		const minH = Math.min(v[K.minHeight] as number, maxH);

		let w: number, h: number;
		if (isNaN(layoutWidth)) {
			v[K.layoutWidthExplicitlySet] = false;
			w = this._preferredUWidth();
		} else {
			v[K.layoutWidthExplicitlySet] = true;
			w = Math.max(minW, Math.min(maxW, layoutWidth));
		}
		if (isNaN(layoutHeight)) {
			v[K.layoutHeightExplicitlySet] = false;
			h = this._preferredUHeight();
		} else {
			v[K.layoutHeightExplicitlySet] = true;
			h = Math.max(minH, Math.min(maxH, layoutHeight));
		}

		const m = this._anchorMatrix();
		if (isDeltaIdentity(m)) {
			this._setActualSize(w, h);
			return;
		}
		const fit = fitBounds(
			layoutWidth,
			layoutHeight,
			m,
			this._owner.$explicitWidth,
			this._owner.$explicitHeight,
			this._preferredUWidth(),
			this._preferredUHeight(),
			minW,
			minH,
			maxW,
			maxH,
		);
		this._setActualSize(fit.w, fit.h);
	}

	public setLayoutBoundsPosition(x: number, y: number): void {
		const owner = this._owner;
		const m = owner.matrix;
		if (!isDeltaIdentity(m) || owner.anchorOffsetX !== 0 || owner.anchorOffsetY !== 0) {
			const bounds = new Rectangle();
			this.getLayoutBounds(bounds);
			x += owner.x - bounds.x;
			y += owner.y - bounds.y;
		}
		const prevX = owner.x,
			prevY = owner.y;
		owner.x = x;
		owner.y = y;
		if (owner.x !== prevX || owner.y !== prevY) {
			UIEvent.dispatchUIEvent(owner, UIEvent.MOVE);
		}
	}

	public getLayoutBounds(bounds: Rectangle): void {
		const v = this._v;
		const w = (v[K.layoutWidthExplicitlySet] as boolean)
			? (v[K.width] as number)
			: isNaN(this._owner.$explicitWidth)
				? (v[K.measuredWidth] as number)
				: this._owner.$explicitWidth;
		const h = (v[K.layoutHeightExplicitlySet] as boolean)
			? (v[K.height] as number)
			: isNaN(this._owner.$explicitHeight)
				? (v[K.measuredHeight] as number)
				: this._owner.$explicitHeight;
		this._applyMatrix(bounds, w, h);
	}

	public getPreferredBounds(bounds: Rectangle): void {
		this._applyMatrix(bounds, this._preferredUWidth(), this._preferredUHeight());
	}

	public $invalidateParentLayout(): void {
		const parent = this._owner.parent;
		if (!parent || !this._includeInLayout || !isUIComponent(parent)) return;
		parent.invalidateSize();
		parent.invalidateDisplayList();
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _checkInvalidateFlag(): void {
		const v = this._v;
		const owner = this._owner as IUIOwner & IUIComponent;
		if (v[K.invalidatePropertiesFlag]) validator.invalidateProperties(owner);
		if (v[K.invalidateSizeFlag]) validator.invalidateSize(owner);
		if (v[K.invalidateDisplayListFlag]) validator.invalidateDisplayList(owner);
	}

	private _preferredUWidth(): number {
		return isNaN(this._owner.$explicitWidth) ? (this._v[K.measuredWidth] as number) : this._owner.$explicitWidth;
	}

	private _preferredUHeight(): number {
		return isNaN(this._owner.$explicitHeight) ? (this._v[K.measuredHeight] as number) : this._owner.$explicitHeight;
	}

	private _setActualSize(w: number, h: number): void {
		const v = this._v;
		let changed = false;
		if (v[K.width] !== w) {
			v[K.width] = w;
			changed = true;
		}
		if (v[K.height] !== h) {
			v[K.height] = h;
			changed = true;
		}
		if (changed) {
			this.invalidateDisplayList();
			// A layout size change affects this component's rendered bounds.
			// Propagate dirtiness to ancestors so a cacheAsBitmap parent is
			// rasterized again after deferred UI measurement completes.
			this._owner.$markDirty();
			this._owner.dispatchEventWith(Event.RESIZE);
		}
	}

	private _validateSizeNow(): void {
		this.validateSize(true);
		this._updateFinalSize();
	}

	private _updateFinalSize(): void {
		const v = this._v;
		const w = (v[K.layoutWidthExplicitlySet] as boolean)
			? (v[K.width] as number)
			: isNaN(this._owner.$explicitWidth)
				? (v[K.measuredWidth] as number)
				: this._owner.$explicitWidth;
		const h = (v[K.layoutHeightExplicitlySet] as boolean)
			? (v[K.height] as number)
			: isNaN(this._owner.$explicitHeight)
				? (v[K.measuredHeight] as number)
				: this._owner.$explicitHeight;
		this._setActualSize(w, h);
	}

	private _measureSizes(): boolean {
		const v = this._v;
		if (!v[K.invalidateSizeFlag]) return false;
		if (isNaN(this._owner.$explicitWidth) || isNaN(this._owner.$explicitHeight)) {
			this._owner.measure();
			v[K.measuredWidth] = Math.max(
				Math.min(v[K.measuredWidth] as number, v[K.maxWidth] as number),
				v[K.minWidth] as number,
			);
			v[K.measuredHeight] = Math.max(
				Math.min(v[K.measuredHeight] as number, v[K.maxHeight] as number),
				v[K.minHeight] as number,
			);
		}
		const pw = this._preferredUWidth();
		const ph = this._preferredUHeight();
		if (pw !== v[K.oldPreferWidth] || ph !== v[K.oldPreferHeight]) {
			v[K.oldPreferWidth] = pw;
			v[K.oldPreferHeight] = ph;
			return true;
		}
		return false;
	}

	private _applyMatrix(bounds: Rectangle, w: number, h: number): void {
		bounds.setTo(0, 0, w, h);
		const m = this._anchorMatrix();
		if (isDeltaIdentity(m)) {
			bounds.x += m.tx;
			bounds.y += m.ty;
		} else {
			const { a, b, c, d, tx, ty } = m;
			const x1 = tx,
				y1 = ty;
			const x2 = a * w + tx,
				y2 = b * w + ty;
			const x3 = c * h + tx,
				y3 = d * h + ty;
			const x4 = a * w + c * h + tx,
				y4 = b * w + d * h + ty;
			bounds.x = Math.min(x1, x2, x3, x4);
			bounds.y = Math.min(y1, y2, y3, y4);
			bounds.width = Math.max(x1, x2, x3, x4) - bounds.x;
			bounds.height = Math.max(y1, y2, y3, y4) - bounds.y;
		}
	}

	private _anchorMatrix(): Matrix {
		const m = this._owner.matrix;
		const ox = this._owner.anchorOffsetX,
			oy = this._owner.anchorOffsetY;
		if (ox === 0 && oy === 0) return m;
		return new Matrix(m.a, m.b, m.c, m.d, m.a * -ox + m.c * -oy + m.tx, m.b * -ox + m.d * -oy + m.ty);
	}
}

// ── Type guard ────────────────────────────────────────────────────────────────

export function isUIComponent(obj: unknown): obj is IUIComponent {
	return obj != null && typeof obj === 'object' && 'ui' in obj;
}

// ── fitBounds helper ──────────────────────────────────────────────────────────

function fitBounds(
	_layoutW: number,
	_layoutH: number,
	_matrix: Matrix,
	explicitW: number,
	explicitH: number,
	preferredW: number,
	preferredH: number,
	minW: number,
	minH: number,
	maxW: number,
	maxH: number,
): { w: number; h: number } {
	const w = isNaN(explicitW) ? Math.max(minW, Math.min(maxW, preferredW)) : Math.max(minW, Math.min(maxW, explicitW));
	const h = isNaN(explicitH) ? Math.max(minH, Math.min(maxH, preferredH)) : Math.max(minH, Math.min(maxH, explicitH));
	return { w, h };
}
