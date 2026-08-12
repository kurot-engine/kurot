import { describe, it, expect } from 'vitest';
import { Event } from '../src/blakron/events/Event.js';
import { EventPhase } from '../src/blakron/events/EventPhase.js';

describe('Event', () => {
	it('constructor sets type/bubbles/cancelable', () => {
		const e = new Event('test', true, true);
		expect(e.type).toBe('test');
		expect(e.bubbles).toBe(true);
		expect(e.cancelable).toBe(true);
	});

	it('defaults bubbles=false, cancelable=false', () => {
		const e = new Event('test');
		expect(e.bubbles).toBe(false);
		expect(e.cancelable).toBe(false);
	});

	it('preventDefault only works when cancelable', () => {
		const cancelable = new Event('test', false, true);
		cancelable.preventDefault();
		expect(cancelable.isDefaultPrevented()).toBe(true);

		const notCancelable = new Event('test', false, false);
		notCancelable.preventDefault();
		expect(notCancelable.isDefaultPrevented()).toBe(false);
	});

	it('stopPropagation sets flag', () => {
		const e = new Event('test');
		expect(e.isPropagationStopped).toBe(false);
		e.stopPropagation();
		expect(e.isPropagationStopped).toBe(true);
	});

	it('stopImmediatePropagation sets flag', () => {
		const e = new Event('test');
		expect(e.isPropagationImmediateStopped).toBe(false);
		e.stopImmediatePropagation();
		expect(e.isPropagationImmediateStopped).toBe(true);
	});

	it('object pool create/release reuses instances', () => {
		const e1 = Event.create(Event, 'a', true);
		expect(e1.type).toBe('a');
		expect(e1.bubbles).toBe(true);
		Event.release(e1);

		const e2 = Event.create(Event, 'b', false);
		expect(e2).toBe(e1); // reused
		expect(e2.type).toBe('b');
		expect(e2.bubbles).toBe(false);
		expect(e2.data).toBeUndefined(); // cleaned
	});

	it('resetForPool clears all state', () => {
		const e = new Event('test', true, true);
		e.data = { foo: 1 };
		e.stopPropagation();
		e.preventDefault();

		e.resetForPool('new', false, false);
		expect(e.type).toBe('new');
		expect(e.bubbles).toBe(false);
		expect(e.cancelable).toBe(false);
		expect(e.isPropagationStopped).toBe(false);
		expect(e.isDefaultPrevented()).toBe(false);
		expect(e.eventPhase).toBe(EventPhase.AT_TARGET);
	});

	it('static constants are defined', () => {
		expect(Event.ADDED).toBe('added');
		expect(Event.REMOVED).toBe('removed');
		expect(Event.ENTER_FRAME).toBe('enterFrame');
		expect(Event.COMPLETE).toBe('complete');
		expect(Event.RESIZE).toBe('resize');
	});
});
