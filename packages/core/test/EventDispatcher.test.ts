import { describe, it, expect, vi } from 'vitest';
import { EventDispatcher } from '../src/blakron/events/EventDispatcher.js';
import { Event } from '../src/blakron/events/Event.js';

describe('EventDispatcher', () => {
	it('addEventListener + dispatchEvent calls listener', () => {
		const d = new EventDispatcher();
		const fn = vi.fn();
		d.addEventListener('test', fn);
		d.dispatchEventWith('test');
		expect(fn).toHaveBeenCalledOnce();
	});

	it('event.target is the dispatcher', () => {
		const d = new EventDispatcher();
		let target: unknown;
		d.addEventListener('test', e => {
			target = e.target;
		});
		d.dispatchEventWith('test');
		expect(target).toBe(d);
	});

	it('custom target via constructor', () => {
		const custom = new EventDispatcher();
		const d = new EventDispatcher(custom);
		let target: unknown;
		d.addEventListener('test', e => {
			target = e.target;
		});
		d.dispatchEventWith('test');
		expect(target).toBe(custom);
	});

	it('removeEventListener stops calls', () => {
		const d = new EventDispatcher();
		const fn = vi.fn();
		d.addEventListener('test', fn);
		d.removeEventListener('test', fn);
		d.dispatchEventWith('test');
		expect(fn).not.toHaveBeenCalled();
	});

	it('once fires only once', () => {
		const d = new EventDispatcher();
		const fn = vi.fn();
		d.once('test', fn);
		d.dispatchEventWith('test');
		d.dispatchEventWith('test');
		expect(fn).toHaveBeenCalledOnce();
	});

	it('hasEventListener returns correct state', () => {
		const d = new EventDispatcher();
		expect(d.hasEventListener('test')).toBe(false);
		const fn = () => {};
		d.addEventListener('test', fn);
		expect(d.hasEventListener('test')).toBe(true);
		d.removeEventListener('test', fn);
		expect(d.hasEventListener('test')).toBe(false);
	});

	it('duplicate listener is not added twice', () => {
		const d = new EventDispatcher();
		const fn = vi.fn();
		d.addEventListener('test', fn);
		d.addEventListener('test', fn);
		d.dispatchEventWith('test');
		expect(fn).toHaveBeenCalledOnce();
	});

	it('priority controls execution order', () => {
		const d = new EventDispatcher();
		const order: number[] = [];
		d.addEventListener('test', () => order.push(1), false, 0);
		d.addEventListener('test', () => order.push(2), false, 10);
		d.addEventListener('test', () => order.push(3), false, 5);
		d.dispatchEventWith('test');
		expect(order).toEqual([2, 3, 1]);
	});

	it('dispatchEventWith passes data', () => {
		const d = new EventDispatcher();
		let received: unknown;
		d.addEventListener('test', e => {
			received = e.data;
		});
		d.dispatchEventWith('test', false, { key: 'value' });
		expect(received).toEqual({ key: 'value' });
	});

	it('dispatchEventWith short-circuits when no listeners', () => {
		const d = new EventDispatcher();
		const result = d.dispatchEventWith('nonexistent');
		expect(result).toBe(true);
	});

	it('stopImmediatePropagation stops subsequent listeners', () => {
		const d = new EventDispatcher();
		const fn1 = vi.fn((e: Event) => e.stopImmediatePropagation());
		const fn2 = vi.fn();
		d.addEventListener('test', fn1);
		d.addEventListener('test', fn2);
		d.dispatchEventWith('test');
		expect(fn1).toHaveBeenCalledOnce();
		expect(fn2).not.toHaveBeenCalled();
	});

	it('adding listener during dispatch does not affect current round', () => {
		const d = new EventDispatcher();
		const late = vi.fn();
		d.addEventListener('test', () => {
			d.addEventListener('test', late);
		});
		d.dispatchEventWith('test');
		expect(late).not.toHaveBeenCalled();
		d.dispatchEventWith('test');
		expect(late).toHaveBeenCalled();
	});

	it('removing listener during dispatch does not affect current round', () => {
		const d = new EventDispatcher();
		const fn2 = vi.fn();
		const fn1 = vi.fn(() => {
			d.removeEventListener('test', fn2);
		});
		d.addEventListener('test', fn1);
		d.addEventListener('test', fn2);
		d.dispatchEventWith('test');
		expect(fn1).toHaveBeenCalledOnce();
		expect(fn2).toHaveBeenCalledOnce();
		fn2.mockClear();
		d.dispatchEventWith('test');
		expect(fn2).not.toHaveBeenCalled();
	});

	it('capture listener stored separately', () => {
		const d = new EventDispatcher();
		const bubble = vi.fn();
		const capture = vi.fn();
		d.addEventListener('test', bubble, false);
		d.addEventListener('test', capture, true);
		d.dispatchEventWith('test');
		expect(bubble).toHaveBeenCalledOnce();
	});

	it('removeEventListener with wrong useCapture does not remove', () => {
		const d = new EventDispatcher();
		const fn = vi.fn();
		d.addEventListener('test', fn, true);
		d.removeEventListener('test', fn, false);
		expect(d.hasEventListener('test')).toBe(true);
	});

	describe('once() reentrancy', () => {
		it('consumes a once-listener before a recursive dispatch on the same dispatcher', () => {
			const dispatcher = new EventDispatcher();
			const listener = vi.fn(() => dispatcher.dispatchEventWith('test'));
			dispatcher.once('test', listener);
			dispatcher.dispatchEventWith('test');
			expect(listener).toHaveBeenCalledOnce();
			expect(dispatcher.hasEventListener('test')).toBe(false);
		});

		it('keeps once-listeners isolated across nested dispatchers', () => {
			const a = new EventDispatcher();
			const b = new EventDispatcher();
			const aOnce = vi.fn();
			const bOnce = vi.fn();
			a.once('test', aOnce, false, 10);
			a.addEventListener('test', () => b.dispatchEventWith('test'));
			b.once('test', bOnce);
			a.dispatchEventWith('test');
			a.dispatchEventWith('test');
			b.dispatchEventWith('test');
			expect(aOnce).toHaveBeenCalledOnce();
			expect(bOnce).toHaveBeenCalledOnce();
		});

		it('restores dispatch state and consumes once-listeners when a listener throws', () => {
			const dispatcher = new EventDispatcher();
			const error = new Error('listener failed');
			const listener = vi.fn(() => {
				throw error;
			});
			dispatcher.once('test', listener);
			expect(() => dispatcher.dispatchEventWith('test')).toThrow(error);
			expect(listener).toHaveBeenCalledOnce();
			expect(dispatcher.hasEventListener('test')).toBe(false);
			expect((dispatcher as unknown as { _notifyLevel: number })._notifyLevel).toBe(0);
		});
	});
});
