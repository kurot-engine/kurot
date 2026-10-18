import { Watcher } from './Watcher.js';
import type { IEventDispatcher } from '@kurot/core';

/**
 * Creates reactive property-chain bindings.
 * Binding hosts must dispatch property-change events for observed properties.
 */
export class Binding {
	/**
	 * Binds a property chain on `host` to a target property.
	 * Assigns the initial value synchronously. An empty chain returns undefined.
	 * Hosts along the chain must dispatch PROPERTY_CHANGE; ordinary assignment
	 * alone is not observed. Retain the returned Watcher and unwatch it when the
	 * owning view closes. Assignment/handler errors propagate synchronously.
	 *
	 * ```ts
	 * import { EventDispatcher } from '@kurot/core';
	 * import { Binding, Label, PropertyEvent } from '@kurot/ui';
	 *
	 * const user = Object.assign(new EventDispatcher(), { name: 'Player' });
	 * const label = new Label();
	 * const watcher = Binding.bindProperty(user, ['name'], label, 'text');
	 * user.name = 'Ada';
	 * PropertyEvent.dispatchPropertyEvent(user, 'name');
	 * watcher?.unwatch();
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
	 * Calls the handler synchronously with the initial value before returning.
	 * An empty chain returns undefined without calling the handler. Changes need
	 * PROPERTY_CHANGE notifications; exceptions propagate. The caller must unwatch
	 * the returned Watcher on disposal, independently of stage removal.
	 *
	 * ```ts
	 * import { EventDispatcher } from '@kurot/core';
	 * import { Binding } from '@kurot/ui';
	 *
	 * const user = Object.assign(new EventDispatcher(), { name: 'Player' });
	 * const watcher = Binding.bindHandler(user, ['name'], value => console.log(value), undefined);
	 * watcher?.unwatch();
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
	 * With multiple template entries, replaces watched entries with Watchers and
	 * returns only the last one. Keep/unwatch every Watcher in templates on disposal;
	 * the returned Watcher alone does not clean up all bindings. The single-chain,
	 * single-entry fast path instead returns bindProperty's Watcher without changing
	 * templates. Assignment is immediate and errors propagate synchronously.
	 *
	 * ```ts
	 * import { EventDispatcher } from '@kurot/core';
	 * import { Binding, Label, Watcher } from '@kurot/ui';
	 *
	 * const score = Object.assign(new EventDispatcher(), { hits: 0, total: 10 });
	 * const label = new Label();
	 * const templates: unknown[] = ['hits', ' / ', 'total'];
	 * Binding.bindProperties(score, templates, [0, 2], label, 'text');
	 * function disposeScoreBinding(): void {
	 *   for (const entry of templates) {
	 *     if (entry instanceof Watcher) {
	 *       entry.unwatch();
	 *     }
	 *   }
	 * }
	 * disposeScoreBinding();
	 * ```
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
