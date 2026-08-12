import { Event } from '@blakron/core';

/**
 * Dispatched by Scroller during throw (inertial scrolling).
 *
 * Listeners can call `preventDefault()` to cancel the throw animation,
 * or modify `toPos` to redirect the throw target.
 *
 * Egret-compatible: eui.ScrollerThrowEvent
 */
export class ScrollerThrowEvent extends Event {
	// ── Static fields ─────────────────────────────────────────────────────

	public static readonly THROW_H = 'throwH';
	public static readonly THROW_V = 'throwV';

	// ── Instance fields ───────────────────────────────────────────────────

	public currentPos = 0;
	public toPos = 0;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}
}
