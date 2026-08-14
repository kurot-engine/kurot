import { Event, type IEventDispatcher } from '@kurot/core';

/**
 * UI component lifecycle and interaction event.
 */
export class UIEvent extends Event {
	// ── Static fields ─────────────────────────────────────────────────────

	/**
	 * Dispatched when a component finishes initialization after being added to stage.
	 */
	public static readonly CREATION_COMPLETE = 'creationComplete';

	/**
	 * Dispatched when a change interaction ends (e.g. slider released).
	 */
	public static readonly CHANGE_END = 'changeEnd';

	/**
	 * Dispatched when a change interaction begins.
	 */
	public static readonly CHANGE_START = 'changeStart';

	/**
	 * Dispatched before a panel closes.
	 */
	public static readonly CLOSING = 'closing';

	/**
	 * Dispatched when a UI component's position changes within its parent.
	 */
	public static readonly MOVE = 'move';

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Dispatches a UI event when the target has a listener.
	 * Returns `true` without allocating an event when no listener is registered.
	 */
	public static dispatchUIEvent(
		target: IEventDispatcher,
		eventType: string,
		bubbles = false,
		cancelable = false,
	): boolean {
		if (!target.hasEventListener(eventType)) return true;
		const event = new UIEvent(eventType, bubbles, cancelable);
		return target.dispatchEvent(event);
	}
}
