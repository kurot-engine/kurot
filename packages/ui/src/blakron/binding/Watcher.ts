import type { Event, IEventDispatcher } from '@blakron/core';
import { PropertyEvent } from '../events/PropertyEvent.js';

/**
 * An object that can both dispatch {@link PropertyEvent.PROPERTY_CHANGE} and be
 * read by arbitrary property name (i.e. it is a record of named bindable values).
 *
 * This is the minimal contract a binding host must satisfy. In practice every
 * host is an {@link EventDispatcher} subclass (Skin, Component, Group, …) whose
 * own properties are mutated and then announced via
 * {@link PropertyEvent.dispatchPropertyEvent}. The index signature models that
 * dynamic access without forcing every host through `as unknown as Record<…>`.
 */
export type Bindable = IEventDispatcher & Record<string, unknown>;

/**
 * Watcher monitors a property (or property chain) on a host object.
 * When the property changes (via {@link PropertyEvent}), the registered
 * handler is invoked with the new value.
 *
 * Create instances via the static {@link Watcher.watch} method — do not use the
 * constructor directly.
 */
export class Watcher {
	// ── Instance fields ───────────────────────────────────────────────────

	private _host?: Bindable;
	private readonly _property: string;
	private _handler?: (value: unknown) => void;
	private _thisObject: unknown;
	private readonly _next?: Watcher;
	private _isExecuting = false;

	// ── Constructor ───────────────────────────────────────────────────────

	public constructor(
		property: string,
		handler: ((value: unknown) => void) | undefined,
		thisObject: unknown,
		next: Watcher | undefined,
	) {
		this._property = property;
		this._handler = handler;
		this._thisObject = thisObject;
		this._next = next;
	}

	// ── Public methods ────────────────────────────────────────────────────

	/**
	 * Creates and starts a Watcher for a property chain.
	 *
	 * ```ts
	 * // watches host.a.b.c
	 * Watcher.watch(host, ['a', 'b', 'c'], (value) => { ... }, this);
	 * ```
	 *
	 * @param host   Root object hosting the chain.  Must dispatch
	 *               `PropertyEvent.PROPERTY_CHANGE` when its bindable
	 *               properties change (i.e. implement `IEventDispatcher`).
	 * @param chain  Property names forming the chain, e.g. `['a','b','c']`.
	 * @param handler Called with the new leaf value whenever the chain changes.
	 * @param thisObject  `this` context for the handler.
	 * @returns The head Watcher, or `undefined` if `chain` is empty.
	 */
	public static watch(
		host: IEventDispatcher | undefined,
		chain: string[],
		handler: ((value: unknown) => void) | undefined,
		thisObject: unknown,
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

		// The cast is unavoidable: `IEventDispatcher` (core) is not generic over
		// a property map, so TS cannot know the host also exposes bindable own
		// properties by name. `Bindable` only adds an index signature on top of
		// `IEventDispatcher` — it models what every real host (Skin, Component,
		// Group) already does at runtime. This is the single place the engine
		// bridges the event-dispatcher contract and dynamic property access.
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

	private _onPropertyChange = (e: Event): void => {
		// `e` arrives as `Event` because the listener is registered through the
		// `IEventDispatcher` interface, whose signature is not generic over an
		// EventMap (core 1.0 limitation). The dispatcher always uses
		// `PropertyEvent.dispatchPropertyEvent`, which constructs a
		// `PropertyEvent`, so the runtime type is guaranteed.
		if (!(e instanceof PropertyEvent)) return;
		if (e.property !== this._property || this._isExecuting) return;
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
}
