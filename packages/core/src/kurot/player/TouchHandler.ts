import { Stage } from '../display/Stage.js';
import { DisplayObject } from '../display/DisplayObject.js';
import { TouchEvent } from '../events/TouchEvent.js';

/**
 * Manages touch/mouse input on a canvas element and dispatches TouchEvent
 * to the appropriate DisplayObject in the display list.
 *
 * Equivalent to Egret's `sys.TouchHandler` + `WebTouchHandler`.
 */
export class TouchHandler {
	// ── Instance fields ───────────────────────────────────────────────────────

	private _stage: Stage;
	private _canvas: HTMLCanvasElement;
	private _maxTouches: number;
	private _useTouchesCount = 0;
	private _touchDownTarget: Map<number, DisplayObject> = new Map();
	private _lastTouchX = -1;
	private _lastTouchY = -1;
	private _scaleX = 1;
	private _scaleY = 1;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(stage: Stage, canvas: HTMLCanvasElement) {
		this._stage = stage;
		this._canvas = canvas;
		this._maxTouches = stage.maxTouches;
		this.bindEvents();
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Updates the coordinate scale factors when the canvas size changes.
	 * Call this after resizing the canvas or changing the stage size.
	 */
	public updateScale(scaleX: number, scaleY: number): void {
		this._scaleX = scaleX;
		this._scaleY = scaleY;
	}

	public updateMaxTouches(value: number): void {
		this._maxTouches = value;
	}

	public dispose(): void {
		this._canvas.removeEventListener('touchstart', this.onTouchStartEvent);
		this._canvas.removeEventListener('touchmove', this.onTouchMoveEvent);
		this._canvas.removeEventListener('touchend', this.onTouchEndEvent);
		this._canvas.removeEventListener('touchcancel', this.onTouchEndEvent);
		this._canvas.removeEventListener('mousedown', this.onMouseDown);
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
		this._touchDownTarget.clear();
		this._useTouchesCount = 0;
	}

	// ── Touch event handlers ──────────────────────────────────────────────────

	public onTouchBegin(x: number, y: number, touchPointID: number): void {
		if (this._useTouchesCount >= this._maxTouches) return;
		this._lastTouchX = x;
		this._lastTouchY = y;

		const target = this.findTarget(x, y);
		if (!this._touchDownTarget.has(touchPointID)) {
			this._touchDownTarget.set(touchPointID, target);
			this._useTouchesCount++;
		}
		TouchEvent.dispatchTouchEvent(target, TouchEvent.TOUCH_BEGIN, true, true, x, y, touchPointID, true);
	}

	public onTouchMove(x: number, y: number, touchPointID: number): void {
		if (!this._touchDownTarget.has(touchPointID)) return;
		if (this._lastTouchX === x && this._lastTouchY === y) return;
		this._lastTouchX = x;
		this._lastTouchY = y;

		const target = this.findTarget(x, y);
		TouchEvent.dispatchTouchEvent(target, TouchEvent.TOUCH_MOVE, true, true, x, y, touchPointID, true);
	}

	public onTouchEnd(x: number, y: number, touchPointID: number): void {
		const oldTarget = this._touchDownTarget.get(touchPointID);
		if (!oldTarget) return;
		this._touchDownTarget.delete(touchPointID);
		this._useTouchesCount--;

		const target = this.findTarget(x, y);
		TouchEvent.dispatchTouchEvent(target, TouchEvent.TOUCH_END, true, true, x, y, touchPointID, false);

		if (oldTarget === target) {
			TouchEvent.dispatchTouchEvent(target, TouchEvent.TOUCH_TAP, true, true, x, y, touchPointID, false);
		} else {
			TouchEvent.dispatchTouchEvent(
				oldTarget,
				TouchEvent.TOUCH_RELEASE_OUTSIDE,
				true,
				true,
				x,
				y,
				touchPointID,
				false,
			);
		}
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private findTarget(stageX: number, stageY: number): DisplayObject {
		return this._stage.$hitTest(stageX, stageY) ?? this._stage;
	}

	private getStageCoords(clientX: number, clientY: number): { x: number; y: number } {
		const rect = this._canvas.getBoundingClientRect();
		// Use clientLeft/clientTop to offset for CSS borders on the canvas.
		// getBoundingClientRect() includes borders, but the stage content
		// area starts at (clientLeft, clientTop) inside the rect.
		return {
			x: (clientX - rect.left - this._canvas.clientLeft) * this._scaleX,
			y: (clientY - rect.top - this._canvas.clientTop) * this._scaleY,
		};
	}

	private bindEvents(): void {
		this._canvas.addEventListener('touchstart', this.onTouchStartEvent, { passive: false });
		this._canvas.addEventListener('touchmove', this.onTouchMoveEvent, { passive: false });
		this._canvas.addEventListener('touchend', this.onTouchEndEvent);
		this._canvas.addEventListener('touchcancel', this.onTouchEndEvent);
		this._canvas.addEventListener('mousedown', this.onMouseDown);
		// Keep tracking an active drag after the pointer leaves the canvas.
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
	}

	private onTouchStartEvent = (e: globalThis.TouchEvent): void => {
		e.preventDefault();
		for (let i = 0; i < e.changedTouches.length; i++) {
			const touch = e.changedTouches[i];
			const { x, y } = this.getStageCoords(touch.clientX, touch.clientY);
			this.onTouchBegin(x, y, touch.identifier);
		}
	};

	private onTouchMoveEvent = (e: globalThis.TouchEvent): void => {
		e.preventDefault();
		for (let i = 0; i < e.changedTouches.length; i++) {
			const touch = e.changedTouches[i];
			const { x, y } = this.getStageCoords(touch.clientX, touch.clientY);
			this.onTouchMove(x, y, touch.identifier);
		}
	};

	private onTouchEndEvent = (e: globalThis.TouchEvent): void => {
		for (let i = 0; i < e.changedTouches.length; i++) {
			const touch = e.changedTouches[i];
			const { x, y } = this.getStageCoords(touch.clientX, touch.clientY);
			this.onTouchEnd(x, y, touch.identifier);
		}
	};

	private onMouseDown = (e: MouseEvent): void => {
		// Prevent the canvas from stealing focus away from any native input
		// element that is about to be focused by the touch handler (e.g. a
		// TextField in INPUT mode). Without this, the browser would move focus
		// to the canvas on mousedown, immediately blurring the input.
		e.preventDefault();
		const { x, y } = this.getStageCoords(e.clientX, e.clientY);
		this.onTouchBegin(x, y, 0);
	};

	private onMouseMove = (e: MouseEvent): void => {
		const { x, y } = this.getStageCoords(e.clientX, e.clientY);
		this.onTouchMove(x, y, 0);
	};

	private onMouseUp = (e: MouseEvent): void => {
		const { x, y } = this.getStageCoords(e.clientX, e.clientY);
		this.onTouchEnd(x, y, 0);
	};
}
