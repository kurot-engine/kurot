import { ticker, getTimer } from '@kurot/core';
import { Animation } from './Animation.js';

// ── Constants ──────────────────────────────────────────────────────────

const MAX_VELOCITY_COUNT = 4;
const MINIMUM_VELOCITY = 0.02;
const FRICTION_LOG = Math.log(0.998);

function easeOut(ratio: number): number {
	const inv = ratio - 1.0;
	return inv * inv * inv + 1;
}

/**
 * Touch-scroll physics simulator.
 *
 * Records velocity while the user drags, then computes a target position
 * and easing duration for the "throw" phase when the finger is released.
 *
 * Usage:
 * 1. Call `start(touchPoint)` on touch-begin.
 * 2. Call `update(touchPoint, maxScroll, currentScroll)` on touch-move.
 * 3. Call `finish(currentScroll, maxScroll)` on touch-end.
 */
export class TouchScroll {
	// ── Instance fields ───────────────────────────────────────────────────

	public scrollFactor = 1.0;
	public bounces = true;

	private _updateFunction: (scrollPos: number) => void;
	private _endFunction: () => void;
	private _animation: Animation;
	private _previousTime = 0;
	private _velocity = 0;
	private _previousVelocity: number[] = [];
	private _currentPosition = 0;
	private _previousPosition = 0;
	private _currentScrollPos = 0;
	private _maxScrollPos = 0;
	private _offsetPoint = 0;
	private _started = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(updateFunction: (scrollPos: number) => void, endFunction: () => void) {
		this._updateFunction = updateFunction;
		this._endFunction = endFunction;
		this._animation = new Animation(this._onScrollingUpdate, this);
		this._animation.easerFunction = easeOut;
		this._animation.endFunction = () => this._endFunction();
	}

	// ── Public methods ────────────────────────────────────────────────────

	public isPlaying(): boolean {
		return this._animation.isPlaying;
	}

	public stop(): void {
		this._animation.stop();
		ticker.stopTick(this._onTick, this);
		this._started = false;
	}

	public isStarted(): boolean {
		return this._started;
	}

	public start(touchPoint: number): void {
		this._started = true;
		this._velocity = 0;
		this._previousVelocity.length = 0;
		this._previousTime = getTimer();
		this._previousPosition = this._currentPosition = touchPoint;
		this._offsetPoint = touchPoint;
		ticker.startTick(this._onTick, this);
	}

	public update(touchPoint: number, maxScrollValue: number, scrollValue: number): void {
		maxScrollValue = Math.max(maxScrollValue, 0);
		this._currentPosition = touchPoint;
		this._maxScrollPos = maxScrollValue;

		const disMove = this._offsetPoint - touchPoint;
		let scrollPos = disMove + scrollValue;
		this._offsetPoint = touchPoint;

		if (scrollPos < 0) {
			if (!this.bounces) {
				scrollPos = 0;
			} else {
				scrollPos -= disMove * 0.5;
			}
		}
		if (scrollPos > maxScrollValue) {
			if (!this.bounces) {
				scrollPos = maxScrollValue;
			} else {
				scrollPos -= disMove * 0.5;
			}
		}

		this._currentScrollPos = scrollPos;
		this._updateFunction(scrollPos);
	}

	public finish(currentScrollPos: number, maxScrollPos: number): void {
		this._currentScrollPos = currentScrollPos;
		this._maxScrollPos = maxScrollPos = Math.max(0, maxScrollPos);
		ticker.stopTick(this._onTick, this);
		this._started = false;

		if (currentScrollPos < 0 || currentScrollPos > maxScrollPos) {
			const posTo = Math.max(0, Math.min(maxScrollPos, currentScrollPos));
			this._throwTo(posTo, 300);
		} else {
			let velocity = this._velocity * 2;
			let weight = 2;
			for (let i = 0; i < this._previousVelocity.length; i++) {
				velocity += this._previousVelocity[i]! * (i + 1);
				weight += i + 1;
			}
			velocity = velocity / weight * Math.max(0, this.scrollFactor);
			if (getTimer() - this._previousTime > 100 || Math.abs(velocity) <= MINIMUM_VELOCITY) {
				this._endFunction();
				return;
			}
			const duration = Math.min(1500, Math.log(MINIMUM_VELOCITY / Math.abs(velocity)) / FRICTION_LOG);
			const distance = velocity * (1 - Math.exp(FRICTION_LOG * duration)) / -FRICTION_LOG;
			this._throwTo(Math.max(0, Math.min(maxScrollPos, currentScrollPos - distance)), duration);
		}
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _onTick = (timeStamp: number): boolean => {
		const timeOffset = timeStamp - this._previousTime;
		if (timeOffset > 10) {
			const pv = this._previousVelocity;
			if (pv.length >= MAX_VELOCITY_COUNT) {
				pv.shift();
			}
			this._velocity = (this._currentPosition - this._previousPosition) / timeOffset;
			pv.push(this._velocity);
			this._previousTime = timeStamp;
			this._previousPosition = this._currentPosition;
		}
		return true;
	};

	private _throwTo(posTo: number, duration = 300): void {
		const hsp = this._currentScrollPos;
		if (Math.abs(hsp - posTo) < 0.5) {
			this._endFunction();
			return;
		}
		const anim = this._animation;
		anim.duration = duration;
		anim.from = hsp;
		anim.to = posTo;
		anim.play();
	}

	private _onScrollingUpdate(animation: Animation): void {
		this._currentScrollPos = animation.currentValue;
		this._updateFunction(animation.currentValue);
	}
}
