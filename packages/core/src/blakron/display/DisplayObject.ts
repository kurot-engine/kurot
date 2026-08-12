import { EventDispatcher } from '../events/EventDispatcher.js';
import { Event, type EventMap } from '../events/Event.js';
import { EventPhase } from '../events/EventPhase.js';
import { FocusEvent } from '../events/FocusEvent.js';
import { TouchEvent } from '../events/TouchEvent.js';
import { Matrix, sharedMatrix } from '../geom/Matrix.js';
import { Point } from '../geom/Point.js';
import { Rectangle, sharedRectangle } from '../geom/Rectangle.js';
import { DisplayList } from '../player/canvas/DisplayList.js';
import type { Filter } from '../filters/Filter.js';
import { blendModeToNumber, numberToBlendMode } from './enums/BlendMode.js';
import type { DisplayObjectContainer } from './DisplayObjectContainer.js';
import type { Stage } from './Stage.js';
import type { Graphics } from './Graphics.js';

/**
 * EventMap for DisplayObject and all its subclasses (Sprite, Stage, TextField, ...).
 *
 * Maps each event type string to the concrete Event subclass that the framework
 * dispatches for that type, so `addEventListener(TouchEvent.TOUCH_TAP, e => ...)`
 * infers `e` as `TouchEvent` instead of the `Event` base class.
 *
 * Subclasses that emit additional event types (e.g. TextField dispatches
 * TextEvent.LINK) may declare their own EventMap extending this one and pass
 * it to EventDispatcher via a generic EventDispatcher subclass.
 */
export interface DisplayObjectEvents extends EventMap {
	// Base Event payloads
	[Event.ADDED]: Event;
	[Event.REMOVED]: Event;
	[Event.ADDED_TO_STAGE]: Event;
	[Event.REMOVED_FROM_STAGE]: Event;
	[Event.ENTER_FRAME]: Event;
	[Event.RENDER]: Event;
	[Event.RESIZE]: Event;
	[Event.CHANGE]: Event;
	[Event.COMPLETE]: Event;

	// Touch events — payload is always TouchEvent
	[TouchEvent.TOUCH_BEGIN]: TouchEvent;
	[TouchEvent.TOUCH_MOVE]: TouchEvent;
	[TouchEvent.TOUCH_END]: TouchEvent;
	[TouchEvent.TOUCH_CANCEL]: TouchEvent;
	[TouchEvent.TOUCH_TAP]: TouchEvent;
	[TouchEvent.TOUCH_RELEASE_OUTSIDE]: TouchEvent;

	// Focus events — payload is always FocusEvent
	[FocusEvent.FOCUS_IN]: FocusEvent;
	[FocusEvent.FOCUS_OUT]: FocusEvent;
}

/** Options for caching a display subtree as one reusable texture. */
export interface CacheAsTextureOptions {
	/** Raster resolution. Higher values improve sharpness at a memory cost. */
	resolution?: number;
	/** Sampling mode used when the cached texture is scaled. */
	scaleMode?: 'linear' | 'nearest';
}

function clampRotation(value: number): number {
	value %= 360;
	if (value > 180) {
		value -= 360;
	} else if (value < -180) {
		value += 360;
	}
	return value;
}

/** @internal Render mode hint for the renderer. */
export const enum RenderMode {
	NONE = 1,
	FILTER = 2,
	CLIP = 3,
	SCROLLRECT = 4,
}

/** @internal Identifies the concrete renderable type, replacing instanceof checks in hot paths. */
export const enum RenderObjectType {
	NONE = 0,
	BITMAP = 1,
	MESH = 2,
	SHAPE = 3,
	SPRITE = 4,
	TEXT = 5,
	PARTICLE = 6,
}

export class DisplayObject extends EventDispatcher<DisplayObjectEvents> {
	// ── Static fields ─────────────────────────────────────────────────────────

	static defaultTouchEnabled = false;
	static $enterFrameCallBackList: DisplayObject[] = [];
	static $renderCallBackList: DisplayObject[] = [];
	static $eventAddToStageList: DisplayObject[] = [];
	static $eventRemoveFromStageList: DisplayObject[] = [];

	/**
	 * @internal
	 * Injected by Player at startup. Called when $renderMode changes (visible,
	 * filters, mask, blendMode) so the WebGLRenderer can mark its InstructionSet dirty.
	 *
	 * Single-Player engine: Player assigns this directly in its constructor and
	 * clears it in `destroy()`. There is intentionally no registration API.
	 */
	static $onStructureChange?: () => void;

	/**
	 * @internal
	 * Injected by Player at startup. Called when a DisplayObject's visual data
	 * changes (position, texture, alpha, tint) but the scene structure is unchanged.
	 * The renderer uses this to update the transform snapshot in the InstructionSet
	 * without doing a full rebuild.
	 *
	 * Single-Player engine: Player assigns this directly in its constructor and
	 * clears it in `destroy()`. There is intentionally no registration API.
	 */
	static $onRenderableDirty?: (obj: DisplayObject) => void;


	// ── Instance fields ───────────────────────────────────────────────────────

	// 场景图
	$hasAddToStage = false;
	$children?: DisplayObject[];
	$parent?: DisplayObjectContainer;
	$stage?: Stage;
	$nestLevel = 0;

	// 变换
	$x = 0;
	$y = 0;
	$anchorOffsetX = 0;
	$anchorOffsetY = 0;
	$explicitWidth: number = NaN;
	$explicitHeight: number = NaN;
	$useTranslate = false;

	// 外观
	$visible = true;
	$alpha = 1;
	$blendMode = 0;
	$filters: Filter[] = [];
	$cacheAsBitmap = false;
	$touchEnabled: boolean = DisplayObject.defaultTouchEnabled;

	// 遮罩
	$mask?: DisplayObject;
	$maskRect?: Rectangle;
	$scrollRect?: Rectangle;
	$maskedObject?: DisplayObject;

	// 渲染状态
	$renderMode?: RenderMode;
	$renderObjectType: RenderObjectType = RenderObjectType.NONE;
	$renderDirty = false;
	$cacheDirty = false;
	$displayList?: DisplayList;

	// 世界缓存（$markDirty 更新，O(1) 读取）
	$worldAlpha = 1;
	$worldTint = 0xffffff;
	$tintRGB = 0;

	// 排序
	$sortDirty = false;
	$lastSortedIndex = 0;

	// bounds 缓存
	private _boundsDirty = true;
	private readonly _cachedBounds = new Rectangle();

	// 私有
	private _name = '';
	private _matrix: Matrix = new Matrix();
	private _matrixDirty = false;
	private _concatenatedMatrix?: Matrix;
	private _invertedConcatenatedMatrix?: Matrix;
	private _scaleX = 1;
	private _scaleY = 1;
	private _rotation = 0;
	private _skewX = 0;
	private _skewXdeg = 0;
	private _skewY = 0;
	private _skewYdeg = 0;
	private _tint = 0xffffff;
	private _zIndex = 0;
	private _sortableChildren = false;

	protected _graphics?: Graphics;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor() {
		super();
		this.tint = 0xffffff;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	public get graphics(): Graphics | undefined {
		return this._graphics;
	}

	public get name(): string {
		return this._name;
	}
	public set name(value: string) {
		this._name = value;
	}

	public get parent(): DisplayObjectContainer | undefined {
		return this.$parent;
	}
	public get stage(): Stage | undefined {
		return this.$stage;
	}

	public get matrix(): Matrix {
		return this.$getMatrix().clone();
	}
	public set matrix(value: Matrix) {
		this.$setMatrix(value);
	}

	public get x(): number {
		return this.$x;
	}
	public set x(value: number) {
		this.$setX(value);
	}

	public get y(): number {
		return this.$y;
	}
	public set y(value: number) {
		this.$setY(value);
	}

	public get scaleX(): number {
		return this._scaleX;
	}
	public set scaleX(value: number) {
		this.$setScaleX(value);
	}

	public get scaleY(): number {
		return this._scaleY;
	}
	public set scaleY(value: number) {
		this.$setScaleY(value);
	}

	public get rotation(): number {
		return this._rotation;
	}
	public set rotation(value: number) {
		this.$setRotation(value);
	}

	public get skewX(): number {
		return this._skewXdeg;
	}
	public set skewX(value: number) {
		this.$setSkewX(value);
	}

	public get skewY(): number {
		return this._skewYdeg;
	}
	public set skewY(value: number) {
		this.$setSkewY(value);
	}

	public get width(): number {
		return isNaN(this.$explicitWidth) ? this.$getOriginalBounds().width : this.$explicitWidth;
	}
	public set width(value: number) {
		this.$explicitWidth = isNaN(value) ? NaN : value;
	}

	public get height(): number {
		return isNaN(this.$explicitHeight) ? this.$getOriginalBounds().height : this.$explicitHeight;
	}
	public set height(value: number) {
		this.$explicitHeight = isNaN(value) ? NaN : value;
	}

	public get measuredWidth(): number {
		return this.$getOriginalBounds().width;
	}
	public get measuredHeight(): number {
		return this.$getOriginalBounds().height;
	}

	public get anchorOffsetX(): number {
		return this.$anchorOffsetX;
	}
	public set anchorOffsetX(value: number) {
		this.$setAnchorOffsetX(value);
	}

	public get anchorOffsetY(): number {
		return this.$anchorOffsetY;
	}
	public set anchorOffsetY(value: number) {
		this.$setAnchorOffsetY(value);
	}

	public get visible(): boolean {
		return this.$visible;
	}
	public set visible(value: boolean) {
		this.$setVisible(value);
	}

	public get cacheAsBitmap(): boolean {
		return this.isCachedAsTexture;
	}
	public set cacheAsBitmap(value: boolean) {
		this.cacheAsTexture(value);
	}

	/** PixiJS-style cache API. `cacheAsBitmap` remains an Egret-compatible alias. */
	public cacheAsTexture(value: boolean | CacheAsTextureOptions): void {
		if (value === false) {
			this.$cacheAsBitmap = false;
			this.$setHasDisplayList(false);
			return;
		}
		this.$cacheAsBitmap = true;
		this.$setHasDisplayList(true);
		this.$displayList?.configure(value === true ? {} : value);
		this.updateCacheTexture();
	}

	/** Marks cached content for regeneration on the next render. */
	public updateCacheTexture(): void {
		if (!this.$displayList) return;
		this.$cacheDirty = true;
		this.$cacheDirtyUp();
	}

	public get isCachedAsTexture(): boolean {
		return !!this.$displayList;
	}

	public get filters(): Filter[] {
		return this.$filters;
	}
	public set filters(value: Filter[]) {
		this.$filters = value ? [...value] : [];
		this.$updateRenderMode();
		this.$markDirty();
	}

	public get alpha(): number {
		return this.$alpha;
	}
	public set alpha(value: number) {
		this.$setAlpha(value);
	}

	public get touchEnabled(): boolean {
		return this.$touchEnabled;
	}
	public set touchEnabled(value: boolean) {
		this.$touchEnabled = !!value;
	}

	public get scrollRect(): Rectangle | undefined {
		return this.$scrollRect;
	}
	public set scrollRect(value: Rectangle | undefined) {
		this.$setScrollRect(value);
	}

	public get blendMode(): string {
		return numberToBlendMode(this.$blendMode);
	}
	public set blendMode(value: string) {
		const mode = blendModeToNumber(value);
		if (this.$blendMode === mode) {
			return;
		}
		this.$blendMode = mode;
		this.$updateRenderMode();
		this.$markDirty();
	}

	public get mask(): DisplayObject | Rectangle | undefined {
		return this.$mask ?? this.$maskRect;
	}
	public set mask(value: DisplayObject | Rectangle | undefined) {
		this.$setMask(value);
	}

	public get tint(): number {
		return this._tint;
	}
	public set tint(value: number) {
		this._tint = typeof value === 'number' && value >= 0 && value <= 0xffffff ? value : 0xffffff;
		this.$tintRGB = (this._tint >> 16) + (this._tint & 0xff00) + ((this._tint & 0xff) << 16);
		this.$markTransformDirty();
	}

	public get zIndex(): number {
		return this._zIndex;
	}
	public set zIndex(value: number) {
		this._zIndex = value;
		if (this.parent) {
			this.parent.$sortDirty = true;
		}
	}

	public get sortableChildren(): boolean {
		return this._sortableChildren;
	}
	public set sortableChildren(value: boolean) {
		this._sortableChildren = value;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	public getBounds(resultRect?: Rectangle, calculateAnchor = true): Rectangle {
		resultRect = this.$getTransformedBoundsInternal(this, resultRect);
		if (calculateAnchor) {
			if (this.$anchorOffsetX !== 0) {
				resultRect.x -= this.$anchorOffsetX;
			}
			if (this.$anchorOffsetY !== 0) {
				resultRect.y -= this.$anchorOffsetY;
			}
		}
		return resultRect;
	}

	public getTransformedBounds(targetCoordinateSpace: DisplayObject, resultRect?: Rectangle): Rectangle {
		return this.$getTransformedBoundsInternal(targetCoordinateSpace ?? this, resultRect);
	}

	public globalToLocal(stageX = 0, stageY = 0, resultPoint?: Point): Point {
		return this.$getInvertedConcatenatedMatrix().transformPoint(stageX, stageY, resultPoint);
	}

	public localToGlobal(localX = 0, localY = 0, resultPoint?: Point): Point {
		return this.$getConcatenatedMatrix().transformPoint(localX, localY, resultPoint);
	}

	public hitTestPoint(x: number, y: number, shapeFlag?: boolean): boolean {
		if (this._scaleX === 0 || this._scaleY === 0) {
			return false;
		}
		const m = this.$getInvertedConcatenatedMatrix();
		const bounds = this.getBounds(undefined, false);
		const localX = m.a * x + m.c * y + m.tx;
		const localY = m.b * x + m.d * y + m.ty;
		if (!bounds.contains(localX, localY)) {
			return false;
		}
		const rect = this.$scrollRect ?? this.$maskRect;
		if (rect && !rect.contains(localX, localY)) {
			return false;
		}
		if (!shapeFlag) {
			return true;
		}
		// Pixel-perfect: delegate to $hitTest which Shape/Sprite override
		return this.$hitTest(x, y) !== undefined;
	}

	public sortChildren(): void {
		this.$sortDirty = false;
	}

	public override dispatchEvent(event: Event): boolean {
		if (!event.bubbles) {
			return super.dispatchEvent(event);
		}
		const list = this.$getPropagationList(this);
		const targetIndex = list.length * 0.5;
		event.setDispatchContext(this, EventPhase.AT_TARGET);
		this.$dispatchPropagationEvent(event, list, targetIndex);
		return !event.isDefaultPrevented();
	}

	public override willTrigger(type: string): boolean {
		let node: DisplayObject | undefined = this;
		while (node) {
			if (node.hasEventListener(type)) {
				return true;
			}
			node = node.$parent;
		}
		return false;
	}

	// Overload 1: type-safe path for events declared in DisplayObjectEvents
	public override addEventListener<K extends keyof DisplayObjectEvents & string>(
		type: K,
		listener: (event: DisplayObjectEvents[K]) => void,
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
	// Impl: type-erased to satisfy both overloads (see AnyListener in EventDispatcher)
	public override addEventListener(
		type: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		listener: (event: any) => void,
		useCapture?: boolean,
		priority?: number,
	): void {
		super.addEventListener(type, listener, useCapture, priority);
		if (type === Event.ENTER_FRAME || type === Event.RENDER) {
			const list =
				type === Event.ENTER_FRAME ? DisplayObject.$enterFrameCallBackList : DisplayObject.$renderCallBackList;
			if (!list.includes(this)) {
				list.push(this);
			}
		}
	}

	// Overload 1: type-safe path
	public override removeEventListener<K extends keyof DisplayObjectEvents & string>(
		type: K,
		listener: (event: DisplayObjectEvents[K]) => void,
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
		if ((type === Event.ENTER_FRAME || type === Event.RENDER) && !this.hasEventListener(type)) {
			const list =
				type === Event.ENTER_FRAME ? DisplayObject.$enterFrameCallBackList : DisplayObject.$renderCallBackList;
			const index = list.indexOf(this);
			if (index !== -1) {
				list.splice(index, 1);
			}
		}
	}

	// ── Internal methods (used by subclasses and framework) ───────────────────

	$setParent(parent: DisplayObjectContainer | undefined): void {
		this.$parent = parent;
	}

	$onAddToStage(stage: Stage, $nestLevel: number): void {
		this.$stage = stage;
		this.$nestLevel = $nestLevel;
		this.$hasAddToStage = true;
		DisplayObject.$eventAddToStageList.push(this);
	}

	$onRemoveFromStage(): void {
		this.$nestLevel = 0;
		this.$stage = undefined;
		DisplayObject.$eventRemoveFromStageList.push(this);
	}

	$getMatrix(): Matrix {
		if (this._matrixDirty) {
			this._matrixDirty = false;
			this._matrix.updateScaleAndRotation(this._scaleX, this._scaleY, this._skewX, this._skewY);
		}
		this._matrix.tx = this.$x;
		this._matrix.ty = this.$y;
		return this._matrix;
	}

	$setMatrix(matrix: Matrix, needUpdateProperties = true): void {
		const m = this._matrix;
		m.a = matrix.a;
		m.b = matrix.b;
		m.c = matrix.c;
		m.d = matrix.d;
		this.$x = matrix.tx;
		this.$y = matrix.ty;
		this._matrixDirty = false;
		this.$useTranslate = !(m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1);
		if (needUpdateProperties) {
			this._scaleX = m.getScaleX();
			this._scaleY = m.getScaleY();
			this._skewX = matrix.getSkewX();
			this._skewY = matrix.getSkewY();
			this._skewXdeg = clampRotation((this._skewX * 180) / Math.PI);
			this._skewYdeg = clampRotation((this._skewY * 180) / Math.PI);
			this._rotation = clampRotation((this._skewY * 180) / Math.PI);
		}
		this.$markTransformDirty();
	}

	$getConcatenatedMatrix(): Matrix {
		if (!this._concatenatedMatrix) {
			this._concatenatedMatrix = new Matrix();
		}
		const matrix = this._concatenatedMatrix;
		if (this.$parent) {
			this.$parent.$getConcatenatedMatrix().preMultiplyInto(this.$getMatrix(), matrix);
		} else {
			matrix.copyFrom(this.$getMatrix());
		}
		const ox = this.$anchorOffsetX;
		const oy = this.$anchorOffsetY;
		const rect = this.$scrollRect;
		if (rect) {
			matrix.preMultiplyInto(sharedMatrix.setTo(1, 0, 0, 1, -rect.x - ox, -rect.y - oy), matrix);
		} else if (ox !== 0 || oy !== 0) {
			matrix.preMultiplyInto(sharedMatrix.setTo(1, 0, 0, 1, -ox, -oy), matrix);
		}
		return matrix;
	}

	$getInvertedConcatenatedMatrix(): Matrix {
		if (!this._invertedConcatenatedMatrix) {
			this._invertedConcatenatedMatrix = new Matrix();
		}
		this.$getConcatenatedMatrix().invertInto(this._invertedConcatenatedMatrix);
		return this._invertedConcatenatedMatrix;
	}

	$setX(value: number): boolean {
		if (this.$x === value) {
			return false;
		}
		this.$x = value;
		this.$markTransformDirty();
		return true;
	}

	$setY(value: number): boolean {
		if (this.$y === value) {
			return false;
		}
		this.$y = value;
		this.$markTransformDirty();
		return true;
	}

	$setScaleX(value: number): void {
		if (this._scaleX === value) {
			return;
		}
		this._scaleX = value;
		this._matrixDirty = true;
		this.$updateUseTransform();
		this.$markTransformDirty();
	}

	$setScaleY(value: number): void {
		if (this._scaleY === value) {
			return;
		}
		this._scaleY = value;
		this._matrixDirty = true;
		this.$updateUseTransform();
		this.$markTransformDirty();
	}

	$setRotation(value: number): void {
		value = clampRotation(value);
		if (value === this._rotation) {
			return;
		}
		const delta = ((value - this._rotation) / 180) * Math.PI;
		this._skewX += delta;
		this._skewY += delta;
		this._rotation = value;
		this._matrixDirty = true;
		this.$updateUseTransform();
		this.$markTransformDirty();
	}

	$setSkewX(value: number): void {
		if (value === this._skewXdeg) {
			return;
		}
		this._skewXdeg = value;
		this._skewX = (clampRotation(value) / 180) * Math.PI;
		this._matrixDirty = true;
		this.$updateUseTransform();
		this.$markTransformDirty();
	}

	$setSkewY(value: number): void {
		if (value === this._skewYdeg) {
			return;
		}
		this._skewYdeg = value;
		this._skewY = ((clampRotation(value) + this._rotation) / 180) * Math.PI;
		this._matrixDirty = true;
		this.$updateUseTransform();
		this.$markTransformDirty();
	}

	$setAnchorOffsetX(value: number): void {
		if (this.$anchorOffsetX === value) {
			return;
		}
		this.$anchorOffsetX = value;
		this.$markTransformDirty();
	}

	$setAnchorOffsetY(value: number): void {
		if (this.$anchorOffsetY === value) {
			return;
		}
		this.$anchorOffsetY = value;
		this.$markTransformDirty();
	}

	$setVisible(value: boolean): void {
		if (this.$visible === value) {
			return;
		}
		this.$visible = value;
		this.$updateRenderMode();
		this.$markTransformDirty();
	}

	$setAlpha(value: number): void {
		if (this.$alpha === value) {
			return;
		}
		this.$alpha = value;
		this.$updateRenderMode();
		this.$markTransformDirty();
	}

	$setScrollRect(value: Rectangle | undefined): void {
		if (!value && !this.$scrollRect) {
			return;
		}
		if (value) {
			if (!this.$scrollRect) {
				this.$scrollRect = new Rectangle();
			}
			this.$scrollRect.copyFrom(value);
		} else {
			this.$scrollRect = undefined;
		}
		this.$updateRenderMode();
		this.$markDirty();
	}

	$setHasDisplayList(value: boolean): void {
		const hasDisplayList = !!this.$displayList;
		if (hasDisplayList === value) {
			return;
		}
		if (value) {
			const dl = DisplayList.create(this);
			if (dl) {
				this.$displayList = dl;
				this.$cacheDirty = true;
			}
		} else {
			if (this.$displayList) {
				DisplayList.release(this.$displayList);
				this.$displayList = undefined;
			}
		}
		// cacheAsBitmap toggle changes the instruction set structure:
		// the subtree either collapses to a single displayListCache instruction
		// or expands back to individual leaf instructions.
		DisplayObject.$onStructureChange?.();
		this.$markDirty();
	}

	$cacheDirtyUp(): void {
		const p = this.$parent;
		if (p && !p.$cacheDirty) {
			p.$cacheDirty = true;
			p._boundsDirty = true;
			p.$cacheDirtyUp();
		}
	}

	$renderDirtyUp(): void {
		const p = this.$parent;
		if (p && !p.$renderDirty) {
			p.$renderDirty = true;
			p.$renderDirtyUp();
		}
	}

	$updateUseTransform(): void {
		this.$useTranslate = !(this._scaleX === 1 && this._scaleY === 1 && this._skewX === 0 && this._skewY === 0);
	}

	$updateRenderMode(): void {
		if (!this.$visible || this.$alpha <= 0 || this.$maskedObject) {
			this.$renderMode = RenderMode.NONE;
		} else if (this.$filters.length > 0) {
			this.$renderMode = RenderMode.FILTER;
		} else if (this.$blendMode !== 0 || (this.$mask && this.$mask.$stage)) {
			this.$renderMode = RenderMode.CLIP;
		} else if (this.$scrollRect || this.$maskRect) {
			this.$renderMode = RenderMode.SCROLLRECT;
		} else {
			this.$renderMode = undefined;
		}
		// RenderMode change means the instruction set structure is stale.
		DisplayObject.$onStructureChange?.();
	}

	$getOriginalBounds(): Rectangle {
		if (!this._boundsDirty) {
			return this._cachedBounds;
		}
		const bounds = this.$getContentBounds();
		this.$measureChildBounds(bounds);
		this._cachedBounds.copyFrom(bounds);
		this._boundsDirty = false;
		return this._cachedBounds;
	}

	$measureChildBounds(_bounds: Rectangle): void {}

	$getContentBounds(): Rectangle {
		const bounds = sharedRectangle;
		bounds.setEmpty();
		this.$measureContentBounds(bounds);
		return bounds;
	}

	$measureContentBounds(_bounds: Rectangle): void {}

	$getTransformedBoundsInternal(targetCoordinateSpace: DisplayObject, resultRect?: Rectangle): Rectangle {
		const bounds = this.$getOriginalBounds();
		if (!resultRect) {
			resultRect = new Rectangle();
		}
		resultRect.copyFrom(bounds);
		if (targetCoordinateSpace === this) {
			return resultRect;
		}
		const m = sharedMatrix;
		targetCoordinateSpace.$getInvertedConcatenatedMatrix().preMultiplyInto(this.$getConcatenatedMatrix(), m);
		m.transformBounds(resultRect);
		return resultRect;
	}

	$getConcatenatedMatrixAt(root: DisplayObject, matrix: Matrix): void {
		const invertMatrix = root.$getInvertedConcatenatedMatrix();
		if ((invertMatrix.a === 0 || invertMatrix.d === 0) && (invertMatrix.b === 0 || invertMatrix.c === 0)) {
			let target: DisplayObject = this;
			const rootLevel = root.$nestLevel;
			matrix.identity();
			while (target.$nestLevel > rootLevel) {
				const rect = target.$scrollRect;
				if (rect) matrix.concat(sharedMatrix.setTo(1, 0, 0, 1, -rect.x, -rect.y));
				matrix.concat(target.$getMatrix());
				target = target.$parent!;
			}
		} else {
			invertMatrix.preMultiplyInto(matrix, matrix);
		}
	}

	$hitTest(stageX: number, stageY: number): DisplayObject | undefined {
		if (!this.$visible || this._scaleX === 0 || this._scaleY === 0) {
			return undefined;
		}

		const m = this.$getInvertedConcatenatedMatrix();
		if (m.a === 0 && m.b === 0 && m.c === 0 && m.d === 0) {
			return undefined;
		}

		const bounds = this.$getContentBounds();
		const localX = m.a * stageX + m.c * stageY + m.tx;
		const localY = m.b * stageX + m.d * stageY + m.ty;
		if (bounds.contains(localX, localY)) {
			if (!this.$children) {
				const rect = this.$scrollRect ?? this.$maskRect;
				if (rect && !rect.contains(localX, localY)) {
					return undefined;
				}
				if (this.$mask && !this.$mask.$hitTest(stageX, stageY)) {
					return undefined;
				}
			}
			return this;
		}
		return undefined;
	}

	$updateRenderNode(): void {}

	$getPropagationList(target: DisplayObject): DisplayObject[] {
		const list: DisplayObject[] = [];
		let current: DisplayObject | undefined = target;
		while (current) {
			list.push(current);
			current = current.$parent;
		}
		return [...[...list].reverse(), ...list];
	}

	$dispatchPropagationEvent(event: Event, list: DisplayObject[], targetIndex: number): void {
		for (let i = 0; i < list.length; i++) {
			const currentTarget = list[i];

			let phase: number;
			if (i < targetIndex - 1) {
				phase = EventPhase.CAPTURING_PHASE;
			} else if (i > targetIndex) {
				phase = EventPhase.BUBBLING_PHASE;
			} else {
				phase = EventPhase.AT_TARGET;
			}

			event.setCurrentTarget(currentTarget);
			event.setDispatchContext(currentTarget, phase);

			currentTarget.notifyListener(event, i < targetIndex);

			if (event.isPropagationStopped || event.isPropagationImmediateStopped) {
				return;
			}
		}
	}

	// ── Private methods ───────────────────────────────────────────────────────

	$setMask(value: DisplayObject | Rectangle | undefined): void {
		if (value === this) {
			return;
		}
		const previousMask = this.$mask;
		if (value instanceof DisplayObject) {
			if (value === previousMask) {
				return;
			}
			if (value.$maskedObject) {
				value.$maskedObject.mask = undefined;
			}
			if (previousMask) {
				previousMask.$maskedObject = undefined;
				previousMask.$updateRenderMode();
			}
			value.$maskedObject = this;
			value.$updateRenderMode();
			this.$mask = value;
			this.$maskRect = undefined;
		} else {
			if (previousMask) {
				previousMask.$maskedObject = undefined;
				previousMask.$updateRenderMode();
			}
			this.$mask = undefined;
			if (value instanceof Rectangle) {
				if (!this.$maskRect) {
					this.$maskRect = new Rectangle();
				}
				this.$maskRect.copyFrom(value);
			} else {
				this.$maskRect = undefined;
			}
		}
		this.$updateRenderMode();
		this.$markDirty();
	}

	$markDirty(): void {
		this.$renderDirty = true;
		this.$markTransformDirty();
	}

	/** Marks world placement/color dirty without invalidating this object's cached pixels. */
	$markTransformDirty(): void {
		this._boundsDirty = true;

		// Update cached world alpha and tint so _refreshLeafTransform can read
		// them in O(1) without walking the parent chain.
		let alpha = this.$alpha;
		let tint = this.$tintRGB;
		let p = this.$parent;
		while (p) {
			alpha *= p.$alpha;
			// Rendering applies the closest non-default tint: an object's own tint
			// overrides its parent, otherwise it inherits the nearest tinted ancestor.
			if (tint === 0xffffff && p.$tintRGB !== 0xffffff) {
				tint = p.$tintRGB;
			}
			p = p.$parent;
		}
		this.$worldAlpha = alpha;
		this.$worldTint = tint;

		// Notify the renderer that this object's data changed.
		DisplayObject.$onRenderableDirty?.(this);
		const parent = this.$parent;
		if (parent && !parent.$cacheDirty) {
			parent.$cacheDirty = true;
			parent._boundsDirty = true;
			parent.$cacheDirtyUp();
		}
		if (parent && !parent.$renderDirty) {
			parent.$renderDirty = true;
			parent.$renderDirtyUp();
		}
		const masked = this.$maskedObject;
		if (masked && !masked.$cacheDirty) {
			masked.$cacheDirty = true;
			masked.$cacheDirtyUp();
		}
	}
}
