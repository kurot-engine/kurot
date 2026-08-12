import { describe, it, expect, vi } from 'vitest';
import { EventDispatcher } from '@blakron/core';
import { Binding } from '../src/blakron/binding/Binding.js';
import { PropertyEvent } from '../src/blakron/events/PropertyEvent.js';

/** Minimal bindable host — same shape as in Watcher.test.ts. */
class BindableHost extends EventDispatcher {
	constructor(initialProps: Record<string, unknown> = {}) {
		super();
		Object.assign(this, initialProps);
	}
	set(prop: string, value: unknown): void {
		(this as Record<string, unknown>)[prop] = value;
		PropertyEvent.dispatchPropertyEvent(this, prop);
	}
}

/** A simple target whose property we bind into. */
class Target extends EventDispatcher {
	public value = '';
}

describe('Binding', () => {
	describe('bindProperty', () => {
		it('writes the initial host value to the target immediately', () => {
			const host = new BindableHost({ name: 'Alice' });
			const target = new Target();

			Binding.bindProperty(host, ['name'], target, 'value');

			expect(target.value).toBe('Alice');
		});

		it('updates the target when the host property changes', () => {
			const host = new BindableHost({ name: 'Alice' });
			const target = new Target();
			Binding.bindProperty(host, ['name'], target, 'value');

			host.set('name', 'Bob');

			expect(target.value).toBe('Bob');
		});

		it('walks a multi-hop chain', () => {
			const leaf = new BindableHost({ value: 42 });
			const root = new BindableHost({ child: leaf });
			const target = new Target();

			Binding.bindProperty(root, ['child', 'value'], target, 'value');

			expect(target.value).toBe(42);

			leaf.set('value', 99);
			expect(target.value).toBe(99);
		});
	});

	describe('bindHandler', () => {
		it('invokes the handler with the initial value immediately', () => {
			const host = new BindableHost({ count: 5 });
			const handler = vi.fn();

			Binding.bindHandler(host, ['count'], handler, undefined);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenLastCalledWith(5);
		});

		it('invokes the handler on subsequent changes', () => {
			const host = new BindableHost({ count: 5 });
			const handler = vi.fn();
			Binding.bindHandler(host, ['count'], handler, undefined);
			handler.mockClear();

			host.set('count', 10);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenLastCalledWith(10);
		});
	});

	describe('bindProperties (template-string binding)', () => {
		it('single-chain template behaves like bindProperty', () => {
			const host = new BindableHost({ name: 'Zed' });
			const target = new Target();

			Binding.bindProperties(host, ['name'], [0], target, 'value');

			expect(target.value).toBe('Zed');
			host.set('name', 'New');
			expect(target.value).toBe('New');
		});

		it('multi-part template concatenates literals and dynamic values', () => {
			const host = new BindableHost({ first: 'Jane', last: 'Doe' });
			const target = new Target();

			// Template: `${first} ${last}!`  → ['first', ' ', 'last', '!']
			// chainIndex marks which entries are dynamic property chains.
			Binding.bindProperties(host, ['first', ' ', 'last', '!'], [0, 2], target, 'value');

			expect(target.value).toBe('Jane Doe!');

			host.set('first', 'John');
			expect(target.value).toBe('John Doe!');

			host.set('last', 'Smith');
			expect(target.value).toBe('John Smith!');
		});
	});
});
