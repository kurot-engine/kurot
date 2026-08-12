import { describe, it, expect, vi } from 'vitest';
import { DisplayObjectContainer } from '../src/blakron/display/DisplayObjectContainer.js';
import { DisplayObject } from '../src/blakron/display/DisplayObject.js';
import { Event } from '../src/blakron/events/Event.js';
import { EventDispatcher } from '../src/blakron/events/EventDispatcher.js';

/**
 * Tests the full capture → target → bubble propagation chain.
 * DisplayObject overrides dispatchEvent to implement DOM-style event flow.
 */

describe('Event propagation (bubbling events on DisplayObject hierarchy)', () => {
	it('bubbling event propagates target → parent → grandparent', () => {
		const root = new DisplayObjectContainer();
		const parent = new DisplayObjectContainer();
		const child = new DisplayObject();
		root.addChild(parent);
		parent.addChild(child);

		const order: string[] = [];

		root.addEventListener('test', () => order.push('root'), false);
		parent.addEventListener('test', () => order.push('parent'), false);
		child.addEventListener('test', () => order.push('child'), false);

		const event = new Event('test', true); // bubbles
		child.dispatchEvent(event);

		// child fires first (target), then parent, then root
		expect(order).toEqual(['child', 'parent', 'root']);
	});

	it('capture phase runs before target and bubble', () => {
		const root = new DisplayObjectContainer();
		const parent = new DisplayObjectContainer();
		const child = new DisplayObject();
		root.addChild(parent);
		parent.addChild(child);

		const order: string[] = [];

		root.addEventListener('test', () => order.push('root-capture'), true);
		parent.addEventListener('test', () => order.push('parent-capture'), true);
		child.addEventListener('test', () => order.push('child-bubble'), false);
		parent.addEventListener('test', () => order.push('parent-bubble'), false);
		root.addEventListener('test', () => order.push('root-bubble'), false);

		const event = new Event('test', true);
		child.dispatchEvent(event);

		expect(order).toEqual(['root-capture', 'parent-capture', 'child-bubble', 'parent-bubble', 'root-bubble']);
	});

	it('stopPropagation prevents further bubble phases', () => {
		const root = new DisplayObjectContainer();
		const child = new DisplayObject();
		root.addChild(child);

		const fn1 = vi.fn();
		const fn2 = vi.fn();
		child.addEventListener('test', fn1);
		root.addEventListener('test', fn2);

		const event = new Event('test', true);
		// stop at child
		child.addEventListener('test', e => e.stopPropagation(), false);

		child.dispatchEvent(event);

		// fn1 fires (before stop), fn2 does NOT fire
		expect(fn1).toHaveBeenCalled();
		expect(fn2).not.toHaveBeenCalled();
	});

	it('non-bubbling event only fires at target', () => {
		const root = new DisplayObjectContainer();
		const child = new DisplayObject();
		root.addChild(child);

		const rootFn = vi.fn();
		const childFn = vi.fn();
		root.addEventListener('test', rootFn, false);
		child.addEventListener('test', childFn, false);

		const event = new Event('test', false); // non-bubbling
		child.dispatchEvent(event);

		expect(childFn).toHaveBeenCalledOnce();
		expect(rootFn).not.toHaveBeenCalled();
	});

	it('willTrigger walks parent chain', () => {
		const root = new DisplayObjectContainer();
		const parent = new DisplayObjectContainer();
		const child = new DisplayObject();
		root.addChild(parent);
		parent.addChild(child);

		root.addEventListener('test', () => {});
		expect(child.willTrigger('test')).toBe(true);
		expect(child.willTrigger('nonexistent')).toBe(false);
	});

	it('ENTER_FRAME dispatches as non-bubbling on target', () => {
		const obj = new DisplayObject();
		const fn = vi.fn();
		obj.addEventListener(Event.ENTER_FRAME, fn);

		const event = new Event(Event.ENTER_FRAME, false);
		obj.dispatchEvent(event);

		expect(fn).toHaveBeenCalledOnce();
	});

	it('dispatchEventWith creates and releases event from pool', () => {
		const d = new EventDispatcher();
		let receivedData: unknown;
		d.addEventListener('test', e => {
			receivedData = e.data; // capture before event is recycled
		});
		d.dispatchEventWith('test', false, { key: 'value' });

		expect(receivedData).toEqual({ key: 'value' });
	});

	it('Event.dispatch static method works', () => {
		const d = new EventDispatcher();
		let fired = false;
		d.addEventListener('staticTest', () => {
			fired = true;
		});
		const result = Event.dispatch(d, 'staticTest', false);
		expect(fired).toBe(true);
		expect(result).toBe(true);
	});

	it('Event.dispatch with data', () => {
		const d = new EventDispatcher();
		let received: unknown;
		d.addEventListener('dataTest', e => {
			received = e.data;
		});
		Event.dispatch(d, 'dataTest', false, { payload: 42 });
		expect(received).toEqual({ payload: 42 });
	});

	it('preventDefault returns false from dispatchEvent when cancelable', () => {
		const d = new EventDispatcher();
		d.addEventListener('cancel', e => e.preventDefault());
		const result = d.dispatchEventWith('cancel', false, undefined, true /* cancelable */);
		expect(result).toBe(false);
	});

	it('multiple capture listeners fire in order', () => {
		const root = new DisplayObjectContainer();
		const child = new DisplayObject();
		root.addChild(child);

		const order: string[] = [];
		root.addEventListener('test', () => order.push('capture-1'), true, 10);
		root.addEventListener('test', () => order.push('capture-2'), true, 5);

		const event = new Event('test', true);
		child.dispatchEvent(event);

		expect(order).toEqual(['capture-1', 'capture-2']);
	});
});
