import { Event } from './Event.js';
import type { IEventDispatcher } from './IEventDispatcher.js';

export class ProgressEvent extends Event {
	// ── Static constants ──────────────────────────────────────────────────────

	static readonly PROGRESS = 'progress';
	static readonly SOCKET_DATA = 'socketData';

	// ── Static methods ────────────────────────────────────────────────────────

	public static dispatchProgressEvent(
		target: IEventDispatcher,
		type: string,
		bytesLoaded = 0,
		bytesTotal = 0,
	): boolean {
		const event = Event.create(ProgressEvent, type);
		event.bytesLoaded = bytesLoaded;
		event.bytesTotal = bytesTotal;
		const result = target.dispatchEvent(event);
		Event.release(event);
		return result;
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	public bytesLoaded: number;
	public bytesTotal: number;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false, bytesLoaded = 0, bytesTotal = 0) {
		super(type, bubbles, cancelable);
		this.bytesLoaded = bytesLoaded;
		this.bytesTotal = bytesTotal;
	}
}
