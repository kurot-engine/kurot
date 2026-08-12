import { Event } from './Event.js';
import type { IEventDispatcher } from './IEventDispatcher.js';
import type { Point } from '../geom/Point.js';
import { setRequestRenderingFlag } from '../player/SystemTicker.js';

export class TouchEvent extends Event {
	// ── Static constants ──────────────────────────────────────────────────────

	static readonly TOUCH_MOVE = 'touchMove';
	static readonly TOUCH_BEGIN = 'touchBegin';
	static readonly TOUCH_END = 'touchEnd';
	static readonly TOUCH_CANCEL = 'touchCancel';
	static readonly TOUCH_TAP = 'touchTap';
	static readonly TOUCH_RELEASE_OUTSIDE = 'touchReleaseOutside';

	// ── Static methods ────────────────────────────────────────────────────────

	public static dispatchTouchEvent(
		target: IEventDispatcher,
		type: string,
		bubbles?: boolean,
		cancelable?: boolean,
		stageX?: number,
		stageY?: number,
		touchPointID?: number,
		touchDown = false,
	): boolean {
		if (!bubbles && !target.hasEventListener(type)) return true;
		const event = Event.create(TouchEvent, type, bubbles, cancelable);
		event.initTo(stageX ?? 0, stageY ?? 0, touchPointID ?? 0);
		event.touchDown = touchDown;
		const result = target.dispatchEvent(event);
		Event.release(event);
		return result;
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	public touchPointID = 0;
	public touchDown = false;

	private _stageX = 0;
	private _stageY = 0;
	private _localX = 0;
	private _localY = 0;
	private _targetChanged = true;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(
		type: string,
		bubbles?: boolean,
		cancelable?: boolean,
		stageX?: number,
		stageY?: number,
		touchPointID?: number,
	) {
		super(type, bubbles, cancelable);
		this.initTo(stageX ?? 0, stageY ?? 0, touchPointID ?? 0);
	}

	// ── Getters ───────────────────────────────────────────────────────────────

	public get stageX(): number {
		return this._stageX;
	}

	public get stageY(): number {
		return this._stageY;
	}

	public get localX(): number {
		if (this._targetChanged) this.computeLocalXY();
		return this._localX;
	}

	public get localY(): number {
		if (this._targetChanged) this.computeLocalXY();
		return this._localY;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Requests an immediate re-render after this event is processed.
	 * Full implementation requires the player/runtime layer.
	 */
	public updateAfterEvent(): void {
		setRequestRenderingFlag(true);
	}

	// ── Internal methods ──────────────────────────────────────────────────────

	setDispatchContext(target: IEventDispatcher, phase: number): void {
		super.setDispatchContext(target, phase);
		this._targetChanged = true;
	}

	initTo(stageX: number, stageY: number, touchPointID: number): void {
		this._stageX = stageX;
		this._stageY = stageY;
		this.touchPointID = touchPointID;
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private computeLocalXY(): void {
		this._targetChanged = false;
		const target = this.target as
			| { $getInvertedConcatenatedMatrix?(): { transformPoint(x: number, y: number, out: Point): void } }
			| undefined;
		if (!target?.$getInvertedConcatenatedMatrix) {
			this._localX = this._stageX;
			this._localY = this._stageY;
			return;
		}
		const out = { x: 0, y: 0 } as Point;
		target.$getInvertedConcatenatedMatrix().transformPoint(this._stageX, this._stageY, out);
		this._localX = out.x;
		this._localY = out.y;
	}
}
