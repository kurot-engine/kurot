import { describe, it, expect } from 'vitest';
import { TouchEvent } from '../src/blakron/events/TouchEvent.js';
import { Event, type EventMap } from '../src/blakron/events/Event.js';
import { EventDispatcher } from '../src/blakron/events/EventDispatcher.js';

interface TouchTestEvents extends EventMap {
	[TouchEvent.TOUCH_BEGIN]: TouchEvent;
}

describe('TouchEvent', () => {
	it('localX/localY fall back to stageX/stageY when target lacks $getInvertedConcatenatedMatrix', () => {
		const e = new TouchEvent('touchMove', false, false, 100, 200);
		// Dispatch to an EventDispatcher (no $getInvertedConcatenatedMatrix)
		const d = new EventDispatcher();
		d.dispatchEvent(e);

		// Since EventDispatcher doesn't have $getInvertedConcatenatedMatrix,
		// localX/Y should equal stageX/Y
		expect(e.localX).toBe(100);
		expect(e.localY).toBe(200);
	});

	it('setDispatchContext marks targetChanged for lazy recompute', () => {
		const e = new TouchEvent('touchMove', false, false, 100, 200);
		const d = new EventDispatcher();
		e.setDispatchContext(d, 2);
		// localX access should not throw
		expect(e.localX).toBe(100);
	});

	it('dispatchTouchEvent dispatches event with correct properties', () => {
		const d = new EventDispatcher<TouchTestEvents>();
		let receivedStageX = 0;
		let receivedTouchID = 0;

		d.addEventListener(TouchEvent.TOUCH_BEGIN, (ev) => {
			receivedStageX = ev.stageX;
			receivedTouchID = ev.touchPointID;
		});

		TouchEvent.dispatchTouchEvent(d, 'touchBegin', false, false, 200, 300, 42);
		expect(receivedStageX).toBe(200);
		expect(receivedTouchID).toBe(42);
	});

	it('dispatchTouchEvent short-circuits when no listeners and non-bubbling', () => {
		const d = new EventDispatcher();
		expect(TouchEvent.dispatchTouchEvent(d, 'nonexistent', false)).toBe(true);
	});

	it('dispatchTouchEvent sets touchDown', () => {
		const d = new EventDispatcher<TouchTestEvents>();
		let down = false;
		d.addEventListener(TouchEvent.TOUCH_BEGIN, (ev) => {
			down = ev.touchDown;
		});
		TouchEvent.dispatchTouchEvent(d, 'touchBegin', false, false, 0, 0, 0, true);
		expect(down).toBe(true);
	});

	it('extends Event and works with object pool', () => {
		const e1 = Event.create(TouchEvent, 'tap', true, false);
		expect(e1).toBeInstanceOf(TouchEvent);
		expect(e1.type).toBe('tap');
		expect(e1.bubbles).toBe(true);

		Event.release(e1);
		const e2 = Event.create(TouchEvent, 'move', false);
		expect(e2).toBe(e1);
		expect(e2.type).toBe('move');
	});
});
