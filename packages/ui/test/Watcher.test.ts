import { describe, it, expect, vi } from 'vitest';
import { EventDispatcher } from '@blakron/core';
import { Watcher } from '../src/blakron/binding/Watcher.js';
import { PropertyEvent } from '../src/blakron/events/PropertyEvent.js';

/**
 * Minimal bindable host. Watcher reads/writes properties directly off the
 * host object (it does `host[property]`), so bindable values must live as
 * own properties on the instance — not inside a private dict.
 * `set(name, value)` mutates the own property AND dispatches PropertyEvent,
 * mirroring how real bindable properties fire.
 */
class BindableHost extends EventDispatcher {
	constructor(initialProps: Record<string, unknown> = {}) {
		super();
		Object.assign(this, initialProps);
	}
	set(prop: string, value: unknown): void {
		(this as Record<string, unknown>)[prop] = value;
		PropertyEvent.dispatchPropertyEvent(this, prop);
	}
	notifyChange(prop: string): void {
		PropertyEvent.dispatchPropertyEvent(this, prop);
	}
}

describe('Watcher', () => {
	describe('single-property watch', () => {
		it('invokes the handler only when the watched property changes (not on attach)', () => {
			const host = new BindableHost({ name: 'initial' });
			const handler = vi.fn();
			const w = Watcher.watch(host, ['name'], handler, undefined);

			expect(w).toBeDefined();
			// Watcher is lazy: attaching does not fire the handler.
			expect(handler).not.toHaveBeenCalled();
			expect(w?.getValue()).toBe('initial');

			host.set('name', 'updated');

			expect(handler).toHaveBeenCalledTimes(1);
			expect(handler).toHaveBeenLastCalledWith('updated');
			expect(w?.getValue()).toBe('updated');
		});

		it('does not fire for a different property on the same host', () => {
			const host = new BindableHost({ a: 1, b: 2 });
			const handler = vi.fn();
			Watcher.watch(host, ['a'], handler, undefined);

			host.set('b', 99);

			expect(handler).not.toHaveBeenCalled();
		});

		it('returns undefined for an empty chain', () => {
			const host = new BindableHost({});
			expect(Watcher.watch(host, [], () => {}, undefined)).toBeUndefined();
		});
	});

	describe('chain watch', () => {
		it('walks a multi-hop chain and returns the leaf value', () => {
			const leaf = new BindableHost({ value: 42 });
			const mid = new BindableHost({ child: leaf });
			const root = new BindableHost({ child: mid });

			const handler = vi.fn();
			const w = Watcher.watch(root, ['child', 'child', 'value'], handler, undefined);

			// getValue walks the chain at query time.
			expect(w?.getValue()).toBe(42);

			// Change the leaf — handler should fire with the new leaf value.
			leaf.set('value', 100);

			expect(handler).toHaveBeenLastCalledWith(100);
			expect(w?.getValue()).toBe(100);
		});

		it('re-points the downstream watcher when an intermediate node changes', () => {
			const leafA = new BindableHost({ value: 'A' });
			const leafB = new BindableHost({ value: 'B' });
			const root = new BindableHost({ child: leafA });

			const handler = vi.fn();
			const w = Watcher.watch(root, ['child', 'value'], handler, undefined);

			// Swap the intermediate child to a different subtree.
			root.set('child', leafB);

			expect(handler).toHaveBeenLastCalledWith('B');
			expect(w?.getValue()).toBe('B');

			// Mutating the old subtree must no longer fire the handler.
			handler.mockClear();
			leafA.set('value', 'A2');

			expect(handler).not.toHaveBeenCalled();

			// Mutating the new subtree still fires.
			leafB.set('value', 'B2');

			expect(handler).toHaveBeenLastCalledWith('B2');
		});
	});

	describe('unwatch', () => {
		it('detaches the handler and stops firing', () => {
			const host = new BindableHost({ x: 1 });
			const handler = vi.fn();
			const w = Watcher.watch(host, ['x'], handler, undefined);
			expect(w).toBeDefined();

			host.set('x', 2);
			expect(handler).toHaveBeenCalledTimes(1);

			w?.unwatch();

			host.set('x', 3);
			expect(handler).toHaveBeenCalledTimes(1); // no additional call
		});

		it('removes the property-change listener from the host (no retained reference)', () => {
			const host = new BindableHost({ x: 1 });
			const handler = vi.fn();
			const w = Watcher.watch(host, ['x'], handler, undefined);

			// WeakRef-style check: after unwatch, hasEventListener should be false.
			expect(host.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(true);

			w?.unwatch();

			expect(host.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(false);
		});

		it('detaches every link of a chain watcher', () => {
			const leaf = new BindableHost({ value: 1 });
			const root = new BindableHost({ child: leaf });
			const handler = vi.fn();
			const w = Watcher.watch(root, ['child', 'value'], handler, undefined);

			expect(root.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(true);
			expect(leaf.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(true);

			w?.unwatch();

			expect(root.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(false);
			expect(leaf.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(false);

			leaf.set('value', 999);
			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('reset', () => {
		it('moving the same watcher to a new host fires on the new host only', () => {
			const hostA = new BindableHost({ x: 'a' });
			const hostB = new BindableHost({ x: 'b' });
			const handler = vi.fn();
			const w = Watcher.watch(hostA, ['x'], handler, undefined);

			expect(hostA.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(true);
			expect(hostB.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(false);

			w?.reset(hostB);

			expect(hostA.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(false);
			expect(hostB.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(true);
			// reset is lazy: it re-attaches the listener but does not fire the
			// handler until the next actual property change.
			expect(w?.getValue()).toBe('b');

			hostA.set('x', 'a-changed');
			handler.mockClear();
			hostB.set('x', 'b-changed');
			expect(handler).toHaveBeenLastCalledWith('b-changed');
		});

		it('reset(undefined) detaches without firing', () => {
			const host = new BindableHost({ x: 1 });
			const handler = vi.fn();
			const w = Watcher.watch(host, ['x'], handler, undefined);

			handler.mockClear();
			w?.reset(undefined);

			expect(host.hasEventListener(PropertyEvent.PROPERTY_CHANGE)).toBe(false);
			host.set('x', 2);
			expect(handler).not.toHaveBeenCalled();
		});
	});
});
