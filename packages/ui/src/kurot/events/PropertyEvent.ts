import { Event, type IEventDispatcher } from '@kurot/core';

/**
 * Reports a named property change to bindings and other observers.
 */
export class PropertyEvent extends Event {
	// ── Static fields ─────────────────────────────────────────────────────

	public static readonly PROPERTY_CHANGE = 'propertyChange';

	// ── Instance fields ───────────────────────────────────────────────────

	/**
	 * Name of the property that changed.
	 */
	public property = '';

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Dispatches a property-change event when the target has a listener.
	 * Returns `true` without allocating an event when no listener is registered.
	 */
	public static dispatchPropertyEvent(target: IEventDispatcher, property: string): boolean {
		if (!target.hasEventListener(PropertyEvent.PROPERTY_CHANGE)) return true;
		const e = new PropertyEvent(PropertyEvent.PROPERTY_CHANGE);
		e.property = property;
		return target.dispatchEvent(e);
	}
}
