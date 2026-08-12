import { Event } from './Event.js';
import type { IEventDispatcher } from './IEventDispatcher.js';

export class HTTPStatusEvent extends Event {
	// ── Static constants ──────────────────────────────────────────────────────

	static readonly HTTP_STATUS = 'httpStatus';

	// ── Static methods ────────────────────────────────────────────────────────

	public static dispatchHTTPStatusEvent(target: IEventDispatcher, status: number): boolean {
		const event = Event.create(HTTPStatusEvent, HTTPStatusEvent.HTTP_STATUS);
		event._status = status;
		const result = target.dispatchEvent(event);
		Event.release(event);
		return result;
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	private _status = 0;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	// ── Getters ───────────────────────────────────────────────────────────────

	public get status(): number {
		return this._status;
	}
}
