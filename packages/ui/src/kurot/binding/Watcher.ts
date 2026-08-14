import type { Event, IEventDispatcher } from '@kurot/core';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * Event dispatcher whose properties can be observed by name.
 */
export type Bindable = IEventDispatcher & Record<string, unknown>;

/**
 * Observes a property chain and reports changes to its leaf value.
 *
 * Each object in the chain must dispatch
 * {@link PropertyEvent.PROPERTY_CHANGE} when an observed property changes.
 */
export class Watcher {
	// ── Instance fields ───────────────────────────────────────────────────

	private readonly _property: string;
    private readonly _next?: Watcher;

	private _host?: Bindable;
	private _handler?: (value: unknown) => void;
	private _thisObject: unknown;
    private _isExecuting = false;

	private _onPropertyChange = (event: Event): void => {
		if (!(event instanceof PropertyEvent)) return;
		if (event.property !== this._property || this._isExecuting) return;
		try {
			this._isExecuting = true;
			if (this._next) {
				this._next.reset(this._getHostPropertyValue() as IEventDispatcher | undefined);
			}
			if (this._handler) {
				this._handler.call(this._thisObject, this.getValue());
			}
		} finally {
			this._isExecuting = false;
		}
	};

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(
		property: string,
		handler?: (value: unknown) => void,
		thisObject?: unknown,
		next?: Watcher,
	) {
		this._property = property;
		this._handler = handler;
		this._thisObject = thisObject;
		this._next = next;
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Creates and starts a Watcher for a property chain.
	 * Returns `undefined` when the chain is empty.
	 *
	 * ```ts
	 * Watcher.watch(host, ['profile', 'name'], value => updateName(value));
	 * ```
	 */
	public static watch(
		host: IEventDispatcher | undefined,
		chain: string[],
		handler?: (value: unknown) => void,
		thisObject?: unknown,
	): Watcher | undefined {
		if (chain.length === 0) return undefined;
		const property = chain[0];
		const remaining = chain.slice(1);
		const next = remaining.length > 0 ? Watcher.watch(undefined, remaining, handler, thisObject) : undefined;
		const watcher = new Watcher(property, handler, thisObject, next);
		watcher.reset(host);
		return watcher;
	}

	public getValue(): unknown {
		if (this._next) return this._next.getValue();
		return this._getHostPropertyValue();
	}

	public setHandler(handler: (value: unknown) => void, thisObject: unknown): void {
		this._handler = handler;
		this._thisObject = thisObject;
		if (this._next) this._next.setHandler(handler, thisObject);
	}

	/**
	 * Re-points this watcher at a new host.
	 * Pass `undefined` to detach from the current host.
	 */
	public reset(newHost: IEventDispatcher | undefined): void {
		if (this._host) {
			this._host.removeEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropertyChange);
		}

		this._host = newHost as Bindable | undefined;

		if (this._host) {
			this._host.addEventListener(PropertyEvent.PROPERTY_CHANGE, this._onPropertyChange);
		}

		if (this._next) {
			this._next.reset(this._getHostPropertyValue() as IEventDispatcher | undefined);
		}
	}

	public unwatch(): void {
		this.reset(undefined);
		this._handler = undefined;
		if (this._next) this._next._handler = undefined;
	}

	// ── Private methods ───────────────────────────────────────────────────

	private _getHostPropertyValue(): unknown {
		return this._host ? this._host[this._property] : undefined;
	}
}
