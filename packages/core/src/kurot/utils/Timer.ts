import { EventDispatcher } from '../events/EventDispatcher.js';
import { TimerEvent } from '../events/TimerEvent.js';
import type { EventMap } from '../events/Event.js';
import { ticker, getTimer } from '../player/SystemTicker.js';

export interface TimerEvents extends EventMap {
	[TimerEvent.TIMER]: TimerEvent;
	[TimerEvent.TIMER_COMPLETE]: TimerEvent;
}

/**
 * Timer lets you run code on a specified time sequence.
 * Use start() to begin, and listen for TimerEvent.TIMER / TimerEvent.TIMER_COMPLETE.
 */
export class Timer extends EventDispatcher<TimerEvents> {
	/**
	 * Number of TIMER events before automatic stop and TIMER_COMPLETE; 0 means
	 * unlimited. Initially the constructor's integer-coerced value. Set a finite,
	 * non-negative integer; later assignments are stored without validation.
	 */
	public repeatCount: number;

	private _delay = 0;
	private _currentCount = 0;
	private _running = false;
	private _lastTimeStamp = 0;

	/**
	 * Creates a stopped timer. delay is milliseconds; values below 1 become 1.
	 * repeatCount defaults to 0 (unlimited) and is integer-coerced on construction.
	 * Timing depends on the shared ticker; missed intervals are not replayed in a burst.
	 */
	public constructor(delay: number, repeatCount = 0) {
		super();
		this.delay = delay;
		this.repeatCount = repeatCount | 0;
	}

	/**
	 * Delay in milliseconds. Assignments below 1 clamp to 1; values such as NaN
	 * are not rejected. Provide a finite positive number. Timing follows ticker
	 * updates and cannot guarantee wall-clock precision during browser stalls.
	 */
	public get delay(): number {
		return this._delay;
	}
	public set delay(value: number) {
		if (value < 1) value = 1;
		this._delay = value;
	}

	/**
	 * Number of timer firings since construction or reset(), initially 0.
	 * stop()/start() preserve this count; reset() clears it.
	 */
	public get currentCount(): number {
		return this._currentCount;
	}

	/**
	 * Whether the timer's shared-ticker callback is registered, initially false.
	 * It does not indicate whether the application ticker itself is currently paused.
	 */
	public get running(): boolean {
		return this._running;
	}

	/**
	 * Stops the timer and resets currentCount to 0. Event listeners remain
	 * registered; remove application-owned listeners separately on view disposal.
	 */
	public reset(): void {
		this.stop();
		this._currentCount = 0;
	}

	/**
	 * Registers the timer with the shared ticker; repeated starts are harmless.
	 * Preserves currentCount and restarts the elapsed interval. Does not independently
	 * start requestAnimationFrame; the owning application must run the ticker.
	 */
	public start(): void {
		if (this._running) return;
		this._lastTimeStamp = getTimer();
		ticker.startTick(this._update, this);
		this._running = true;
	}

	/**
	 * Detaches the timer's ticker callback; repeated stops are harmless.
	 * Preserves currentCount and listeners, and does not emit TIMER_COMPLETE.
	 * Call when the owning game round/view exits.
	 *
	 * @example
	 * ```ts
	 * import { Timer, TimerEvent } from '@kurot/core';
	 *
	 * const timer = new Timer(1000, 30);
	 * const onSecond = (): void => { console.log(timer.currentCount); };
	 * timer.addEventListener(TimerEvent.TIMER, onSecond);
	 * timer.start();
	 * function disposeRoundTimer(): void {
	 *   timer.stop();
	 *   timer.removeEventListener(TimerEvent.TIMER, onSecond);
	 * }
	 * disposeRoundTimer();
	 * ```
	 */
	public stop(): void {
		if (!this._running) return;
		ticker.stopTick(this._update, this);
		this._running = false;
	}

	private _update = (timeStamp: number): boolean => {
		const deltaTime = timeStamp - this._lastTimeStamp;
		if (deltaTime < this._delay) return false;
		this._lastTimeStamp = timeStamp;
		this._currentCount++;
		const complete = this.repeatCount > 0 && this._currentCount >= this.repeatCount;
		if (this.repeatCount === 0 || this._currentCount <= this.repeatCount) {
			TimerEvent.dispatchTimerEvent(this, TimerEvent.TIMER);
		}
		if (complete) {
			this.stop();
			TimerEvent.dispatchTimerEvent(this, TimerEvent.TIMER_COMPLETE);
		}
		return false;
	};
}
