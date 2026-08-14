import { Event } from '@kurot/core';

/**
 * Reports the start of inertial scrolling.
 *
 * Call `preventDefault()` to cancel the animation or assign `toPos` to
 * redirect its destination.
 */
export class ScrollerThrowEvent extends Event {
	// ── Static fields ─────────────────────────────────────────────────────

	public static readonly THROW_H = 'throwH';
	public static readonly THROW_V = 'throwV';

	// ── Instance fields ───────────────────────────────────────────────────

	/**
	 * Scroll position at the start of the throw.
	 */
	public currentPos = 0;
	/**
	 * Proposed destination, which listeners may replace.
	 */
	public toPos = 0;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}
}
