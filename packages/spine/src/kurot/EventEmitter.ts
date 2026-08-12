type Listener = { fn: (...args: unknown[]) => void; ctx?: object; once?: boolean };

/**
 * Generic typed event emitter with no external dependencies.
 */
export class EventEmitter<T extends string | number> {
	private _listeners = new Map<T, Listener[]>();

	/**
	 * Register a listener for the given event.
	 */
	public on(event: T, fn: (...args: unknown[]) => void, ctx?: object): this {
		const list = this._listeners.get(event);
		if (list) {
			list.push({ fn, ctx });
		} else {
			this._listeners.set(event, [{ fn, ctx }]);
		}
		return this;
	}

	/**
	 * Register a one-time listener for the given event.
	 */
	public once(event: T, fn: (...args: unknown[]) => void, ctx?: object): this {
		const list = this._listeners.get(event);
		if (list) {
			list.push({ fn, ctx, once: true });
		} else {
			this._listeners.set(event, [{ fn, ctx, once: true }]);
		}
		return this;
	}

	/**
	 * Remove a listener. Omitting `fn` removes all listeners for the event.
	 */
	public off(event: T, fn?: (...args: unknown[]) => void, ctx?: object): this {
		if (fn === undefined) {
			this._listeners.delete(event);
			return this;
		}
		const list = this._listeners.get(event);
		if (!list) return this;
		for (let i = 0; i < list.length; i++) {
			const it = list[i];
			if (it.fn === fn && (ctx === undefined || it.ctx === ctx)) {
				list.splice(i--, 1);
			}
		}
		return this;
	}

	/**
	 * Emit an event, calling all registered listeners.
	 */
	public emit(event: T, ...args: unknown[]): this {
		const list = this._listeners.get(event);
		if (!list) return this;
		for (let i = 0; i < list.length; i++) {
			const it = list[i];
			if (it.once) list.splice(i--, 1);
			it.fn.apply(it.ctx, args);
		}
		return this;
	}
}
