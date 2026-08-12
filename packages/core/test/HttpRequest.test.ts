import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpRequest } from '../src/blakron/net/HttpRequest.js';
import { Event } from '../src/blakron/events/Event.js';
import { IOErrorEvent } from '../src/blakron/events/IOErrorEvent.js';
import { HTTPStatusEvent } from '../src/blakron/events/HTTPStatusEvent.js';

/**
 * Minimal fake XHR: only implements what `HttpRequest.send()` touches, and
 * lets tests drive `onload`/`onerror`/`ontimeout` directly instead of going
 * through a real network stack.
 */
class FakeXHR {
	public status = 0;
	public response: unknown;
	public responseType = '';
	public withCredentials = false;
	public timeout = 0;
	public onload: (() => void) | null = null;
	public onerror: (() => void) | null = null;
	public ontimeout: (() => void) | null = null;
	public onprogress: ((e: { loaded: number; total: number }) => void) | null = null;

	public open = vi.fn();
	public send = vi.fn();
	public abort = vi.fn();
	public getAllResponseHeaders = vi.fn(() => '');
	public setRequestHeader = vi.fn();
	public getResponseHeader = vi.fn(() => '');
}

let fakeXhr: FakeXHR;

beforeEach(() => {
	fakeXhr = new FakeXHR();
	vi.stubGlobal(
		'XMLHttpRequest',
		vi.fn(function XMLHttpRequestMock() {
			return fakeXhr;
		}),
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('HttpRequest', () => {
	it('dispatches COMPLETE for a 2xx response', () => {
		const req = new HttpRequest();
		let completed = false;
		req.addEventListener(Event.COMPLETE, () => (completed = true));
		req.addEventListener(IOErrorEvent.IO_ERROR, () => {
			throw new Error('should not dispatch IO_ERROR');
		});

		req.open('https://example.com/ok');
		req.send();

		fakeXhr.status = 200;
		fakeXhr.response = '{"ok":true}';
		fakeXhr.onload?.();

		expect(completed).toBe(true);
	});

	it('dispatches IO_ERROR (not COMPLETE) for a 404 response', () => {
		const req = new HttpRequest();
		let completed = false;
		let ioError = false;
		req.addEventListener(Event.COMPLETE, () => (completed = true));
		req.addEventListener(IOErrorEvent.IO_ERROR, () => (ioError = true));

		req.open('https://example.com/missing');
		req.send();

		fakeXhr.status = 404;
		fakeXhr.response = 'Not Found';
		fakeXhr.onload?.();

		expect(ioError).toBe(true);
		expect(completed).toBe(false);
	});

	it('dispatches IO_ERROR (not COMPLETE) for a 5xx response', () => {
		const req = new HttpRequest();
		let completed = false;
		let ioError = false;
		req.addEventListener(Event.COMPLETE, () => (completed = true));
		req.addEventListener(IOErrorEvent.IO_ERROR, () => (ioError = true));

		req.open('https://example.com/broken');
		req.send();

		fakeXhr.status = 500;
		fakeXhr.onload?.();

		expect(ioError).toBe(true);
		expect(completed).toBe(false);
	});

	it('treats status 0 (e.g. a blocked CORS request) as an error', () => {
		const req = new HttpRequest();
		let ioError = false;
		req.addEventListener(IOErrorEvent.IO_ERROR, () => (ioError = true));

		req.open('https://example.com/blocked');
		req.send();

		fakeXhr.status = 0;
		fakeXhr.onload?.();

		expect(ioError).toBe(true);
	});

	it('dispatches HTTPStatusEvent with the real status code before COMPLETE/IO_ERROR', () => {
		const req = new HttpRequest();
		let receivedStatus = -1;
		req.addEventListener(HTTPStatusEvent.HTTP_STATUS, e => (receivedStatus = e.status));

		req.open('https://example.com/ok');
		req.send();

		fakeXhr.status = 404;
		fakeXhr.onload?.();

		expect(receivedStatus).toBe(404);
	});

	it('dispatches IO_ERROR on a network-level error (xhr.onerror)', () => {
		const req = new HttpRequest();
		let ioError = false;
		req.addEventListener(IOErrorEvent.IO_ERROR, () => (ioError = true));

		req.open('https://example.com/unreachable');
		req.send();

		fakeXhr.onerror?.();

		expect(ioError).toBe(true);
	});

	it('exposes the response status via the status getter', () => {
		const req = new HttpRequest();
		expect(req.status).toBe(0);

		req.open('https://example.com/ok');
		req.send();
		fakeXhr.status = 200;
		fakeXhr.onload?.();

		expect(req.status).toBe(200);
	});

	it('applies headers queued after open and discards headers from a replaced request', () => {
		const req = new HttpRequest();

		req.open('https://example.com/stale');
		req.setRequestHeader('X-Stale', 'discard-me');
		req.open('https://example.com/current');
		req.setRequestHeader('Authorization', 'Bearer token');
		req.setRequestHeader('X-Trace-Id', 'trace-123');
		req.send();

		expect(fakeXhr.open).toHaveBeenCalledWith('GET', 'https://example.com/current', true);
		expect(fakeXhr.setRequestHeader).toHaveBeenNthCalledWith(1, 'Authorization', 'Bearer token');
		expect(fakeXhr.setRequestHeader).toHaveBeenNthCalledWith(2, 'X-Trace-Id', 'trace-123');
		expect(fakeXhr.setRequestHeader).toHaveBeenCalledTimes(2);
		expect(fakeXhr.send).toHaveBeenCalledWith(undefined);
	});
});
