import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventDispatcher, ticker } from '@kurot/core';
import { Animation } from '../src/kurot/components/Animation.js';
import { TouchScroll } from '../src/kurot/components/TouchScroll.js';
import { Binding } from '../src/kurot/binding/Binding.js';
import { Watcher } from '../src/kurot/binding/Watcher.js';
import { PropertyEvent } from '../src/kurot/events/PropertyEvent.js';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('unbound UI callbacks', () => {
	it('keeps TouchScroll bounce updates bound to their owning instance', () => {
		let now = Date.now();
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const values: number[] = [];
		const end = vi.fn();
		const scroll = new TouchScroll(value => values.push(value), end);
		try {
			scroll.finish(-20, 100);
			now += 150;
			ticker.update(true);
			expect(values.at(-1)).toBeGreaterThan(-20);
			expect(values.at(-1)).toBeLessThan(0);
			now += 150;
			ticker.update(true);
			expect(values.at(-1)).toBe(0);
			expect(end).toHaveBeenCalledTimes(1);
			expect(scroll.isPlaying()).toBe(false);
		} finally {
			scroll.stop();
		}
	});

	it('passes Animation to update/end callbacks without binding a receiver', () => {
		let now = Date.now();
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const values: number[] = [];
		const receivers: unknown[] = [];
		const finished: Animation[] = [];
		const animation = new Animation(function update(this: unknown, current: Animation): void {
			receivers.push(this);
			values.push(current.currentValue);
		});
		animation.endFunction = function end(this: unknown, current: Animation): void {
			receivers.push(this);
			finished.push(current);
			expect(current.isPlaying).toBe(false);
		};
		animation.duration = 100;
		animation.from = 10;
		animation.to = 30;
		animation.easerFunction = value => value;
		try {
			animation.play();
			now += 25;
			ticker.update(true);
			now += 75;
			ticker.update(true);
			now += 100;
			ticker.update(true);
			expect(values).toEqual([10, 15, 30]);
			expect(finished).toEqual([animation]);
			expect(receivers).toEqual([undefined, undefined, undefined, undefined]);
		} finally {
			animation.stop();
		}
	});

	it('stops Animation callbacks without reporting a natural completion', () => {
		const update = vi.fn();
		const end = vi.fn();
		const animation = new Animation(update);
		animation.endFunction = end;
		animation.play();
		animation.stop();
		ticker.update(true);
		expect(update).toHaveBeenCalledTimes(1);
		expect(end).not.toHaveBeenCalled();
	});

	it('uses the same unbound handler for initial binding and property changes', () => {
		const host = Object.assign(new EventDispatcher(), { value: 1 });
		const calls: Array<{ receiver: unknown; value: unknown }> = [];
		const watcher = Binding.bindHandler(host, ['value'], function changed(this: unknown, value: unknown): void {
			calls.push({ receiver: this, value });
		});
		host.value = 2;
		PropertyEvent.dispatchPropertyEvent(host, 'value');
		watcher?.unwatch();
		host.value = 3;
		PropertyEvent.dispatchPropertyEvent(host, 'value');
		expect(calls).toEqual([
			{ receiver: undefined, value: 1 },
			{ receiver: undefined, value: 2 },
		]);
	});

	it('replaces a chain handler and releases old hosts when reset or unwatched', () => {
		const first = Object.assign(new EventDispatcher(), { score: 1 });
		const second = Object.assign(new EventDispatcher(), { score: 2 });
		const root = Object.assign(new EventDispatcher(), { child: first });
		const original = vi.fn();
		const calls: unknown[] = [];
		const watcher = Watcher.watch(root, ['child', 'score'], original);
		watcher?.setHandler(function changed(this: unknown, value: unknown): void {
			expect(this).toBeUndefined();
			calls.push(value);
		});
		root.child = second;
		PropertyEvent.dispatchPropertyEvent(root, 'child');
		first.score = 10;
		PropertyEvent.dispatchPropertyEvent(first, 'score');
		second.score = 20;
		PropertyEvent.dispatchPropertyEvent(second, 'score');
		watcher?.unwatch();
		second.score = 30;
		PropertyEvent.dispatchPropertyEvent(second, 'score');
		expect(original).not.toHaveBeenCalled();
		expect(calls).toEqual([2, 20]);
	});

	it('accepts a downstream Watcher as the third constructor argument', () => {
		const child = Object.assign(new EventDispatcher(), { score: 1 });
		const host = Object.assign(new EventDispatcher(), { child });
		const handler = vi.fn();
		const next = new Watcher('score', handler);
		const watcher = new Watcher('child', undefined, next);
		watcher.reset(host);
		child.score = 2;
		PropertyEvent.dispatchPropertyEvent(child, 'score');
		expect(handler).toHaveBeenLastCalledWith(2);
		watcher.unwatch();
		child.score = 3;
		PropertyEvent.dispatchPropertyEvent(child, 'score');
		expect(handler).toHaveBeenCalledTimes(1);
	});
});
