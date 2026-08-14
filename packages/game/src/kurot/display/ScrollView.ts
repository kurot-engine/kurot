import { Sprite, TouchEvent, Rectangle, Event, type Stage } from '@kurot/core';

/**
 * Scroll policy constants for `ScrollView.horizontalScrollPolicy` and `verticalScrollPolicy`.
 */
export const ScrollPolicy = {
	AUTO: 'auto',
	ON: 'on',
	OFF: 'off',
} as const;
export type ScrollPolicy = (typeof ScrollPolicy)[keyof typeof ScrollPolicy];

// ── Internal types ────────────────────────────────────────────────────────────

interface VelocitySample {
	dx: number;
	dy: number;
	dt: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SAMPLE_COUNT = 5;
const FRICTION = 0.95;
const SPRING = 0.2;
const STOP_THRESHOLD = 0.5;
const RESISTANCE = 0.4;
const FRAME_MS = 16.67;

/**
 * Inertial scrolling container, Egret-compatible.
 *
 * Wraps a content `Sprite` and provides touch-driven inertial scrolling
 * with bounce-back when the content is dragged past its bounds.
 *
 * @example
 * ```ts
 * const sv = new ScrollView();
 * sv.width = 640;
 * sv.height = 960;
 * sv.setContent(myContentSprite);
 * stage.addChild(sv);
 * ```
 */
export class ScrollView extends Sprite {
	// ── Instance fields ───────────────────────────────────────────────────────

	public horizontalScrollPolicy: ScrollPolicy = ScrollPolicy.AUTO;
	public verticalScrollPolicy: ScrollPolicy = ScrollPolicy.AUTO;
	public scrollBeginThreshold = 10;
	public scrollSpeed = 1;
	public bounces = true;

	private _content?: Sprite;
	private _scrollLeft = 0;
	private _scrollTop = 0;
	private _maxScrollLeft = 0;
	private _maxScrollTop = 0;

	// ── Touch tracking ────────────────────────────────────────────────────────

	private _touchActive = false;
	private _touchStage?: Stage;
	private _touchId = -1;
	private _touchLastX = 0;
	private _touchLastY = 0;
	private _touchLastTime = 0;
	private _touchStartX = 0;
	private _touchStartY = 0;
	private _scrollStarted = false;
	private _samples: VelocitySample[] = [];

	// ── Inertia ───────────────────────────────────────────────────────────────

	private _velX = 0;
	private _velY = 0;
	private _inertiaActive = false;
	private _lastInertiaTime = 0;

	// ── Tween scroll ──────────────────────────────────────────────────────────

	private _tweenTarget?: { left: number; top: number };
	private _tweenStart?: { left: number; top: number };
	private _tweenElapsed = 0;
	private _tweenDuration = 0;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor() {
		super();
		this.touchEnabled = true;
		this.addEventListener(TouchEvent.TOUCH_BEGIN, this._handleTouchBegin);
	}

	// ── Getters / Setters ─────────────────────────────────────────────────────

	/**
	 * The current scrollable content object.
	 */
	public get content(): Sprite | undefined {
		return this._content;
	}

	/**
	 * Horizontal scroll position in pixels.
	 */
	public get scrollLeft(): number {
		return this._scrollLeft;
	}

	public set scrollLeft(value: number) {
		this._setScroll(value, this._scrollTop);
	}

	/**
	 * Vertical scroll position in pixels.
	 */
	public get scrollTop(): number {
		return this._scrollTop;
	}

	public set scrollTop(value: number) {
		this._setScroll(this._scrollLeft, value);
	}

	/**
	 * Maximum horizontal scroll distance (read-only).
	 */
	public get scrollRight(): number {
		this._updateScrollBounds();
		return this._maxScrollLeft;
	}

	/**
	 * Maximum vertical scroll distance (read-only).
	 */
	public get scrollBottom(): number {
		this._updateScrollBounds();
		return this._maxScrollTop;
	}

	public override get width(): number {
		return super.width;
	}

	public override set width(value: number) {
		super.width = value;
		this._updateScrollRect();
		this._updateScrollBounds();
	}

	public override get height(): number {
		return super.height;
	}

	public override set height(value: number) {
		super.height = value;
		this._updateScrollRect();
		this._updateScrollBounds();
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Set the scrollable content object.
	 */
	public setContent(content: Sprite): void {
		if (this._content) {
			this.removeChild(this._content);
		}
		this._content = content;
		this.addChild(content);
		this._updateScrollRect();
		this._updateScrollBounds();
	}

	/**
	 * Remove the current content object.
	 */
	public removeContent(): void {
		if (!this._content) return;
		this.removeChild(this._content);
		this._content = undefined;
		this._updateScrollRect();
		this._updateScrollBounds();
	}

	/**
	 * Set both scroll axes simultaneously.
	 * @param top Vertical scroll position.
	 * @param left Horizontal scroll position.
	 * @param isOffset If true, values are treated as deltas relative to the current position.
	 */
	public setScrollPosition(top: number, left: number, isOffset = false): void {
		if (isOffset) {
			this._setScroll(
				this._scrollLeft + left * this.scrollSpeed,
				this._scrollTop + top * this.scrollSpeed,
				this.bounces,
			);
		} else {
			this._setScroll(left, top);
		}
		this.dispatchEventWith(Event.CHANGE);
	}

	/**
	 * Scroll to the given vertical position.
	 * @param scrollTop Target vertical scroll position.
	 * @param duration Tween duration in ms. 0 = instant.
	 */
	public setScrollTop(scrollTop: number, duration = 0): void {
		const target = Math.max(0, Math.min(scrollTop, this._maxScrollTop));
		if (duration === 0) {
			this.scrollTop = target;
			return;
		}
		this._tweenScroll(this._scrollLeft, target, duration);
	}

	/**
	 * Scroll to the given horizontal position.
	 * @param scrollLeft Target horizontal scroll position.
	 * @param duration Tween duration in ms. 0 = instant.
	 */
	public setScrollLeft(scrollLeft: number, duration = 0): void {
		const target = Math.max(0, Math.min(scrollLeft, this._maxScrollLeft));
		if (duration === 0) {
			this.scrollLeft = target;
			return;
		}
		this._tweenScroll(target, this._scrollTop, duration);
	}

	/**
	 * Maximum horizontal scroll distance.
	 */
	public getMaxScrollLeft(): number {
		this._updateScrollBounds();
		return this._maxScrollLeft;
	}

	/**
	 * Maximum vertical scroll distance.
	 */
	public getMaxScrollTop(): number {
		this._updateScrollBounds();
		return this._maxScrollTop;
	}

	// ── Override methods ──────────────────────────────────────────────────────

	public override $onRemoveFromStage(): void {
		this._cancelTouch();
		this._stopInertia();
		this._stopTweenScroll();
		super.$onRemoveFromStage();
	}

	// ── Private methods ───────────────────────────────────────────────────────

	private _handleTouchBegin = (e: TouchEvent): void => {
		if (this._touchActive) return;
		const stage = this.stage;
		if (!stage) return;

		this._updateScrollBounds();
		if (!this._canScrollHorizontally() && !this._canScrollVertically()) return;

		this._touchActive = true;
		this._touchStage = stage;
		this._touchId = e.touchPointID;
		this._touchStartX = e.stageX;
		this._touchStartY = e.stageY;
		this._touchLastX = e.stageX;
		this._touchLastY = e.stageY;
		this._touchLastTime = Date.now();
		this._scrollStarted = false;
		this._samples = [];
		this._velX = 0;
		this._velY = 0;
		this._stopInertia();
		this._stopTweenScroll();

		stage.addEventListener(TouchEvent.TOUCH_MOVE, this._handleTouchMove);
		stage.addEventListener(TouchEvent.TOUCH_END, this._handleTouchEnd);
		stage.addEventListener(TouchEvent.TOUCH_CANCEL, this._handleTouchEnd);
	};

	private _handleTouchMove = (e: TouchEvent): void => {
		if (!this._touchActive || e.touchPointID !== this._touchId) return;

		if (!this._scrollStarted) {
			const dx = e.stageX - this._touchStartX;
			const dy = e.stageY - this._touchStartY;
			if (Math.sqrt(dx * dx + dy * dy) < this.scrollBeginThreshold) return;
			this._scrollStarted = true;
		}

		const now = Date.now();
		const dt = now - this._touchLastTime || 1;
		const dx = e.stageX - this._touchLastX;
		const dy = e.stageY - this._touchLastY;

		this._touchLastX = e.stageX;
		this._touchLastY = e.stageY;
		this._touchLastTime = now;

		this._samples.push({ dx, dy, dt });
		if (this._samples.length > SAMPLE_COUNT) {
			this._samples.shift();
		}

		const newLeft = this._canScrollHorizontally()
			? this._applyResistance(this._scrollLeft - dx * this.scrollSpeed, 0, this._maxScrollLeft)
			: 0;
		const newTop = this._canScrollVertically()
			? this._applyResistance(this._scrollTop - dy * this.scrollSpeed, 0, this._maxScrollTop)
			: 0;
		this._setScroll(newLeft, newTop, this.bounces);
		this.dispatchEventWith(Event.CHANGE);
	};

	private _handleTouchEnd = (e: TouchEvent): void => {
		if (!this._touchActive || e.touchPointID !== this._touchId) return;
		const samples = this._samples;
		this._cancelTouch();

		if (samples.length === 0) return;

		let totalWeight = 0;
		let vx = 0;
		let vy = 0;
		for (let i = 0; i < samples.length; i++) {
			const weight = i + 1;
			const s = samples[i];
			vx += (s.dx / s.dt) * weight;
			vy += (s.dy / s.dt) * weight;
			totalWeight += weight;
		}
		// Samples are pixels/ms; inertia uses pixels/frame.
		this._velX = this._canScrollHorizontally() ? -(vx / totalWeight) * FRAME_MS : 0;
		this._velY = this._canScrollVertically() ? -(vy / totalWeight) * FRAME_MS : 0;
		this._startInertia();
	};

	private _handleEnterFrame = (_e: Event): void => {
		const now = Date.now();
		const dt = now - this._lastInertiaTime;
		this._lastInertiaTime = now;

		if (this._tweenTarget && this._tweenStart) {
			this._tweenElapsed += dt;
			const t = Math.min(this._tweenElapsed / this._tweenDuration, 1);
			const ease = 1 - Math.pow(1 - t, 4);
			const left = this._tweenStart.left + (this._tweenTarget.left - this._tweenStart.left) * ease;
			const top = this._tweenStart.top + (this._tweenTarget.top - this._tweenStart.top) * ease;
			this._setScroll(left, top);
			this.dispatchEventWith(Event.CHANGE);
			if (t >= 1) {
				this._stopTweenScroll();
				this.dispatchEventWith(Event.COMPLETE);
			}
			return;
		}

		const factor = Math.pow(FRICTION, dt / FRAME_MS);
		this._velX *= factor;
		this._velY *= factor;

		let newLeft = this._scrollLeft + this._velX * (dt / FRAME_MS);
		let newTop = this._scrollTop + this._velY * (dt / FRAME_MS);

		if (this.bounces) {
			if (newLeft < 0) {
				newLeft += (0 - newLeft) * SPRING;
				this._velX *= 0.5;
			} else if (newLeft > this._maxScrollLeft) {
				newLeft += (this._maxScrollLeft - newLeft) * SPRING;
				this._velX *= 0.5;
			}
			if (newTop < 0) {
				newTop += (0 - newTop) * SPRING;
				this._velY *= 0.5;
			} else if (newTop > this._maxScrollTop) {
				newTop += (this._maxScrollTop - newTop) * SPRING;
				this._velY *= 0.5;
			}
		} else {
			newLeft = Math.max(0, Math.min(newLeft, this._maxScrollLeft));
			newTop = Math.max(0, Math.min(newTop, this._maxScrollTop));
		}

		this._setScroll(newLeft, newTop, this.bounces);
		this.dispatchEventWith(Event.CHANGE);

		const inBoundsH = newLeft >= 0 && newLeft <= this._maxScrollLeft;
		const inBoundsV = newTop >= 0 && newTop <= this._maxScrollTop;
		if (Math.abs(this._velX) < STOP_THRESHOLD && Math.abs(this._velY) < STOP_THRESHOLD && inBoundsH && inBoundsV) {
			this._stopInertia();
		}
	};

	private _startInertia(): void {
		if (this._inertiaActive) return;
		this._inertiaActive = true;
		this._lastInertiaTime = Date.now();
		this.addEventListener(Event.ENTER_FRAME, this._handleEnterFrame);
	}

	private _stopInertia(): void {
		if (!this._inertiaActive) return;
		this._inertiaActive = false;
		this.removeEventListener(Event.ENTER_FRAME, this._handleEnterFrame);
	}

	private _tweenScroll(targetLeft: number, targetTop: number, duration: number): void {
		this._stopInertia();
		this._tweenStart = { left: this._scrollLeft, top: this._scrollTop };
		this._tweenTarget = { left: targetLeft, top: targetTop };
		this._tweenElapsed = 0;
		this._tweenDuration = duration;
		if (!this._inertiaActive) {
			this._inertiaActive = true;
			this._lastInertiaTime = Date.now();
			this.addEventListener(Event.ENTER_FRAME, this._handleEnterFrame);
		}
	}

	private _stopTweenScroll(): void {
		this._tweenTarget = undefined;
		this._tweenStart = undefined;
		this._tweenElapsed = 0;
		if (this._inertiaActive && Math.abs(this._velX) < STOP_THRESHOLD && Math.abs(this._velY) < STOP_THRESHOLD) {
			this._stopInertia();
		}
	}

	private _setScroll(left: number, top: number, allowOverscroll = false): void {
		this._updateScrollBounds();
		if (!allowOverscroll) {
			left = Math.max(0, Math.min(left, this._maxScrollLeft));
			top = Math.max(0, Math.min(top, this._maxScrollTop));
		}

		if (this._canScrollHorizontally()) {
			this._scrollLeft = left;
		} else if (this.horizontalScrollPolicy === ScrollPolicy.AUTO) {
			this._scrollLeft = 0;
		}
		if (this._canScrollVertically()) {
			this._scrollTop = top;
		} else if (this.verticalScrollPolicy === ScrollPolicy.AUTO) {
			this._scrollTop = 0;
		}

		if (this._content) {
			this._content.x = -this._scrollLeft;
			this._content.y = -this._scrollTop;
		}
	}

	private _applyResistance(value: number, min: number, max: number): number {
		if (value < min) {
			return min + (value - min) * RESISTANCE;
		}
		if (value > max) {
			return max + (value - max) * RESISTANCE;
		}
		return value;
	}

	private _updateScrollRect(): void {
		this.scrollRect = new Rectangle(0, 0, this.width, this.height);
	}

	private _updateScrollBounds(): void {
		if (!this._content) {
			this._maxScrollLeft = 0;
			this._maxScrollTop = 0;
			return;
		}
		this._maxScrollLeft = Math.max(0, this._content.width - this.width);
		this._maxScrollTop = Math.max(0, this._content.height - this.height);
	}

	private _canScrollHorizontally(): boolean {
		return this.horizontalScrollPolicy === ScrollPolicy.ON ||
			(this.horizontalScrollPolicy === ScrollPolicy.AUTO && this._maxScrollLeft > 0);
	}

	private _canScrollVertically(): boolean {
		return this.verticalScrollPolicy === ScrollPolicy.ON ||
			(this.verticalScrollPolicy === ScrollPolicy.AUTO && this._maxScrollTop > 0);
	}

	private _detachStageListeners(): void {
		const stage = this._touchStage;
		if (!stage) return;
		stage.removeEventListener(TouchEvent.TOUCH_MOVE, this._handleTouchMove);
		stage.removeEventListener(TouchEvent.TOUCH_END, this._handleTouchEnd);
		stage.removeEventListener(TouchEvent.TOUCH_CANCEL, this._handleTouchEnd);
		this._touchStage = undefined;
	}

	private _cancelTouch(): void {
		this._touchActive = false;
		this._touchId = -1;
		this._scrollStarted = false;
		this._samples = [];
		this._detachStageListeners();
	}
}
