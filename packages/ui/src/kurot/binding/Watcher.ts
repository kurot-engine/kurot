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
	 * Does not emit an initial callback; read getValue() or use Binding.bindHandler
	 * for that behavior. Each defined chain host must implement IEventDispatcher
	 * and notify PROPERTY_CHANGE. Call unwatch() when its owner closes; errors from
	 * property access or handlers propagate rather than becoming an error event.
	 *
	 * ```ts
	 * import { EventDispatcher } from '@kurot/core';
	 * import { Watcher, PropertyEvent } from '@kurot/ui';
	 *
	 * const host = Object.assign(new EventDispatcher(), { name: 'Player' });
	 * const watcher = Watcher.watch(host, ['name'], value => console.log(value));
	 * host.name = 'Ada';
	 * PropertyEvent.dispatchPropertyEvent(host, 'name');
	 * watcher?.unwatch();
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

	/**
	 * Return the current chain's leaf value, or undefined when a host/leaf is absent.
	 * Reading does not dispatch a change or validate the value's runtime type.
	 */
	public getValue(): unknown {
		if (this._next) return this._next.getValue();
		return this._getHostPropertyValue();
	}

	/**
	 * Replace the chain's handler and callback receiver. Does not immediately emit
	 * the current value; call getValue() for an initial read. Handler errors propagate.
	 */
	public setHandler(handler: (value: unknown) => void, thisObject: unknown): void {
		this._handler = handler;
		this._thisObject = thisObject;
		if (this._next) this._next.setHandler(handler, thisObject);
	}

	/**
	 * Detach old property-change subscriptions and point the chain at a new host.
	 * Undefined detaches it. Does not immediately invoke the handler; unlike a plain
	 * object, each defined host must implement the property-change dispatcher contract.
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

	/**
	 * Detach property-change listeners throughout the chain and clear this watcher's
	 * handler. Call on round/view disposal; removing a display object does not unwatch
	 * manual bindings. Does not dispose the observed data or target.
	 */
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
