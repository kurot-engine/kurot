import { ticker, getTimer } from '@blakron/core';

/**
 * Simple value-tween utility used by TouchScroll for throw animations.
 * Driven by the core ticker (rAF).
 */
export class Animation {
	// ── Instance fields ───────────────────────────────────────────────────

	private _updateFunction: (animation: Animation) => void;
	private _thisObject: unknown;
	private _easerFunction: ((fraction: number) => number) | undefined = f => -(Math.cos(Math.PI * f) - 1) * 0.5;
	private _isPlaying = false;
	private _duration = 500;
	private _currentValue = 0;
	private _from = 0;
	private _to = 0;
	private _startTime = 0;
	private _endFunction?: (animation: Animation) => void;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(updateFunction: (animation: Animation) => void, thisObject: unknown) {
		this._updateFunction = updateFunction;
		this._thisObject = thisObject;
	}

	// ── Getters / Setters ─────────────────────────────────────────────────

	public get isPlaying(): boolean {
		return this._isPlaying;
	}

	public get duration(): number {
		return this._duration;
	}

	public set duration(value: number) {
		this._duration = value;
	}

	public get currentValue(): number {
		return this._currentValue;
	}

	public get from(): number {
		return this._from;
	}

	public set from(value: number) {
		this._from = value;
	}

	public get to(): number {
		return this._to;
	}

	public set to(value: number) {
		this._to = value;
	}

	public get endFunction(): ((animation: Animation) => void) | undefined {
		return this._endFunction;
	}

	public set endFunction(value: ((animation: Animation) => void) | undefined) {
		this._endFunction = value;
	}

	public get easerFunction(): ((fraction: number) => number) | undefined {
		return this._easerFunction;
	}

	public set easerFunction(value: ((fraction: number) => number) | undefined) {
		this._easerFunction = value;
	}

	// ── Public methods ────────────────────────────────────────────────────

	public play(): void {
		this.stop();
		this._start();
	}

	public stop(): void {
		this._isPlaying = false;
		this._startTime = 0;
		ticker.stopTick(this._doInterval, this);
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _start(): void {
		this._isPlaying = false;
		this._currentValue = 0;
		this._startTime = getTimer();
		this._doInterval(this._startTime);
		ticker.startTick(this._doInterval, this);
	}

	private _doInterval = (currentTime: number): boolean => {
		const runningTime = currentTime - this._startTime;
		if (!this._isPlaying) {
			this._isPlaying = true;
		}
		const duration = this._duration;
		let fraction = duration === 0 ? 1 : Math.min(runningTime, duration) / duration;
		if (this._easerFunction) {
			fraction = this._easerFunction(fraction);
		}
		this._currentValue = this._from + (this._to - this._from) * fraction;
		this._updateFunction.call(this._thisObject, this);
		const isEnded = runningTime >= duration;
		if (isEnded) {
			this.stop();
		}
		if (isEnded && this._endFunction) {
			this._endFunction.call(this._thisObject, this);
		}
		return true;
	};
}
