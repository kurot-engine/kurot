import { Event } from './Event.js';
import type { IEventDispatcher } from './IEventDispatcher.js';

export class StageOrientationEvent extends Event {
	// ── Static constants ──────────────────────────────────────────────────────

	static readonly ORIENTATION_CHANGE = 'orientationChange';

	// ── Static methods ────────────────────────────────────────────────────────

	public static dispatchStageOrientationEvent(target: IEventDispatcher, type: string): boolean {
		const event = Event.create(StageOrientationEvent, type);
		const result = target.dispatchEvent(event);
		Event.release(event);
		return result;
	}

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}
}
