import { Event } from './Event.js';

export class FocusEvent extends Event {
	// ── Static constants ──────────────────────────────────────────────────────

	static readonly FOCUS_IN = 'focusIn';
	static readonly FOCUS_OUT = 'focusOut';

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}
}
