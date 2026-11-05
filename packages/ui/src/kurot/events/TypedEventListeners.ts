import type { Event, EventMap } from '@kurot/core';

/**
 * Type-only listener signatures for native UI objects. Declaring these on a
 * subclass refines event payloads without replacing Core's listener machinery.
 */
export interface TypedEventListeners<TEvents extends EventMap> {
	addEventListener<K extends keyof TEvents & string>(
		type: K,
		listener: (event: TEvents[K]) => void,
		useCapture?: boolean,
		priority?: number,
	): void;
	addEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean, priority?: number): void;

	once<K extends keyof TEvents & string>(
		type: K,
		listener: (event: TEvents[K]) => void,
		useCapture?: boolean,
		priority?: number,
	): void;
	once(type: string, listener: (event: Event) => void, useCapture?: boolean, priority?: number): void;

	removeEventListener<K extends keyof TEvents & string>(
		type: K,
		listener: (event: TEvents[K]) => void,
		useCapture?: boolean,
	): void;
	removeEventListener(type: string, listener: (event: Event) => void, useCapture?: boolean): void;
}
