import { Event } from './Event.js';
import type { IEventDispatcher } from './IEventDispatcher.js';

export class TextEvent extends Event {
	// ── Static constants ──────────────────────────────────────────────────────

	static readonly LINK = 'link';

	// ── Static methods ────────────────────────────────────────────────────────

	public static dispatchTextEvent(target: IEventDispatcher, type: string, text: string): boolean {
		const event = Event.create(TextEvent, type);
		event.text = text;
		const result = target.dispatchEvent(event);
		Event.release(event);
		return result;
	}

	// ── Instance fields ───────────────────────────────────────────────────────

	public text: string;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false, text = '') {
		super(type, bubbles, cancelable);
		this.text = text;
	}
}
