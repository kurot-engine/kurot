import { Watcher } from './Watcher.js';
import type { IEventDispatcher } from '@kurot/core';

/**
 * Creates reactive property-chain bindings.
 * Binding hosts must dispatch property-change events for observed properties.
 */
export class Binding {
	/**
	 * Binds a property chain on `host` to a target property.
	 *
	 * ```ts
	 * Binding.bindProperty(user, ['name'], label, 'text');
	 * ```
	 */
	public static bindProperty(host: unknown, chain: string[], target: unknown, prop: string): Watcher | undefined {
		const watcher = Watcher.watch(host as IEventDispatcher | undefined, chain);
		if (watcher) {
			const assign = (value: unknown): void => {
				(target as Record<string, unknown>)[prop] = value;
			};
			watcher.setHandler(assign, undefined);
			assign(watcher.getValue());
		}
		return watcher;
	}

	/**
	 * Binds a property chain on `host` to a handler function.
	 *
	 * ```ts
	 * Binding.bindHandler(user, ['name'], value => console.log(value), undefined);
	 * ```
	 */
	public static bindHandler(
		host: unknown,
		chain: string[],
		handler: (value: unknown) => void,
		thisObject: unknown,
	): Watcher | undefined {
		const watcher = Watcher.watch(host as IEventDispatcher | undefined, chain, handler, thisObject);
		if (watcher) {
			handler.call(thisObject, watcher.getValue());
		}
		return watcher;
	}

	/**
	 * Binds a mixture of literal values and property chains to a string property.
	 *
	 * `chainIndex` identifies entries in `templates` that contain property chains.
	 */
	public static bindProperties(
		host: unknown,
		templates: unknown[],
		chainIndex: number[],
		target: unknown,
		prop: string,
	): Watcher | undefined {
		if (templates.length === 1 && chainIndex.length === 1) {
			return Binding.bindProperty(host, (templates[0] as string).split('.'), target, prop);
		}

		const assign = (): void => {
			(target as Record<string, unknown>)[prop] = _joinValues(templates);
		};

		let lastWatcher: Watcher | undefined;
		for (const index of chainIndex) {
			const element = templates[index];
			let watcher: Watcher | undefined;

			if (typeof element === 'string') {
				watcher = Watcher.watch(host as IEventDispatcher | undefined, element.split('.'));
			} else if (element instanceof Watcher) {
				watcher = element;
				watcher.reset(host as IEventDispatcher | undefined);
			}

			if (watcher) {
				templates[index] = watcher;
				watcher.setHandler(assign, undefined);

				lastWatcher = watcher;
			}
		}

		assign();
		return lastWatcher;
	}
}

// ── Helpers ─────────────────────────────────────────────────────────

function _joinValues(templates: unknown[]): string {
	let value = '';
	for (const item of templates) {
		value += item instanceof Watcher ? String(item.getValue() ?? '') : String(item);
	}
	return value;
}
