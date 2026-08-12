import { describe, it, expect } from 'vitest';
import { HTTPStatusEvent } from '../src/blakron/events/HTTPStatusEvent.js';
import { Event } from '../src/blakron/events/Event.js';
import { EventDispatcher } from '../src/blakron/events/EventDispatcher.js';

describe('HTTPStatusEvent', () => {
	it('dispatchHTTPStatusEvent sends event with status code', () => {
		const d = new EventDispatcher<{ httpStatus: HTTPStatusEvent }>();
		let receivedStatus = 0;

		d.addEventListener('httpStatus', (ev) => {
			receivedStatus = ev.status;
		});

		HTTPStatusEvent.dispatchHTTPStatusEvent(d, 200);
		expect(receivedStatus).toBe(200);
	});

	it('dispatchHTTPStatusEvent with error code', () => {
		const d = new EventDispatcher<{ httpStatus: HTTPStatusEvent }>();
		let receivedStatus = 0;

		d.addEventListener('httpStatus', (ev) => {
			receivedStatus = ev.status;
		});

		HTTPStatusEvent.dispatchHTTPStatusEvent(d, 404);
		expect(receivedStatus).toBe(404);
	});

	it('extends Event and works with object pool', () => {
		const e1 = Event.create(HTTPStatusEvent, 'httpStatus', false);
		expect(e1).toBeInstanceOf(HTTPStatusEvent);

		Event.release(e1);
		const e2 = Event.create(HTTPStatusEvent, 'httpStatus', true);
		expect(e2).toBe(e1);
	});
});
