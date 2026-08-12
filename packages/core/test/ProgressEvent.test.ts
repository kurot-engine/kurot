import { describe, it, expect } from 'vitest';
import { ProgressEvent } from '../src/blakron/events/ProgressEvent.js';
import { Event } from '../src/blakron/events/Event.js';
import { EventDispatcher } from '../src/blakron/events/EventDispatcher.js';

describe('ProgressEvent', () => {
	it('dispatchProgressEvent sends event with correct data', () => {
		const d = new EventDispatcher<{ progress: ProgressEvent }>();
		let loaded = 0;
		let total = 0;

		d.addEventListener('progress', (ev) => {
			loaded = ev.bytesLoaded;
			total = ev.bytesTotal;
		});

		ProgressEvent.dispatchProgressEvent(d, 'progress', 300, 800);
		expect(loaded).toBe(300);
		expect(total).toBe(800);
	});

	it('dispatchProgressEvent returns true when no listener', () => {
		const d = new EventDispatcher();
		expect(ProgressEvent.dispatchProgressEvent(d, 'progress')).toBe(true);
	});

	it('extends Event and works with object pool', () => {
		const e1 = Event.create(ProgressEvent, 'progress', false);
		expect(e1).toBeInstanceOf(ProgressEvent);
		expect(e1.type).toBe('progress');

		Event.release(e1);
		const e2 = Event.create(ProgressEvent, 'load', true);
		expect(e2).toBe(e1);
		expect(e2.type).toBe('load');
	});
});
