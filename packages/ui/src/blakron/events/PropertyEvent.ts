import { Event, type IEventDispatcher } from '@blakron/core';

export class PropertyEvent extends Event {
	// ── Static fields ─────────────────────────────────────────────────────

	public static readonly PROPERTY_CHANGE = 'propertyChange';

	// ── Instance fields ───────────────────────────────────────────────────

	public property = '';

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(type: string, bubbles = false, cancelable = false) {
		super(type, bubbles, cancelable);
	}

	// ── Public methods ────────────────────────────────────────────────────

	public static dispatchPropertyEvent(target: IEventDispatcher, property: string): boolean {
		if (!target.hasEventListener(PropertyEvent.PROPERTY_CHANGE)) return true;
		const e = new PropertyEvent(PropertyEvent.PROPERTY_CHANGE);
		e.property = property;
		return target.dispatchEvent(e);
	}
}
