import { Event } from './Event.js';
import type { IEventDispatcher } from './IEventDispatcher.js';

export class IOErrorEvent extends Event {
	// ── Static constants ──────────────────────────────────────────────────────

	static readonly IO_ERROR = 'ioError';

	// ── Static methods ────────────────────────────────────────────────────────

	public static dispatchIOErrorEvent(target: IEventDispatcher): boolean {
		const event = Event.create(IOErrorEvent, IOErrorEvent.IO_ERROR);
		const result = target.dispatchEvent(event);
		Event.release(event);
		return result;
	}

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}
}
