import { Event } from './Event.js';
import type { IEventDispatcher } from './IEventDispatcher.js';
import { setRequestRenderingFlag } from '../player/SystemTicker.js';

export class TimerEvent extends Event {
	// ── Static constants ──────────────────────────────────────────────────────

	static readonly TIMER = 'timer';
	static readonly TIMER_COMPLETE = 'timerComplete';

	// ── Static methods ────────────────────────────────────────────────────────

	public static dispatchTimerEvent(
		target: IEventDispatcher,
		type: string,
		bubbles?: boolean,
		cancelable?: boolean,
	): boolean {
		const event = Event.create(TimerEvent, type, bubbles, cancelable);
		const result = target.dispatchEvent(event);
		Event.release(event);
		return result;
	}

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(type: string, bubbles?: boolean, cancelable?: boolean) {
		super(type, bubbles, cancelable);
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Requests an immediate re-render after this event is processed.
	 * Full implementation requires the player/runtime layer.
	 */
	public updateAfterEvent(): void {
		setRequestRenderingFlag(true);
	}
}
