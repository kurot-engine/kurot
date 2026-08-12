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
	public repeatCount: number;

	private _delay = 0;
	private _currentCount = 0;
	private _running = false;
	private _lastTimeStamp = 0;

	public constructor(delay: number, repeatCount = 0) {
		super();
		this.delay = delay;
		this.repeatCount = repeatCount | 0;
	}

	public get delay(): number {
		return this._delay;
	}
	public set delay(value: number) {
		if (value < 1) value = 1;
		this._delay = value;
	}

	public get currentCount(): number {
		return this._currentCount;
	}

	public get running(): boolean {
		return this._running;
	}

	public reset(): void {
		this.stop();
		this._currentCount = 0;
	}

	public start(): void {
		if (this._running) return;
		this._lastTimeStamp = getTimer();
		ticker.startTick(this._update, this);
		this._running = true;
	}

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
