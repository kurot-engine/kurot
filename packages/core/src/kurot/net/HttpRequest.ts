import { EventDispatcher } from '../events/EventDispatcher.js';
import { Event, type EventMap } from '../events/Event.js';
import { HTTPStatusEvent } from '../events/HTTPStatusEvent.js';
import { IOErrorEvent } from '../events/IOErrorEvent.js';
import { ProgressEvent } from '../events/ProgressEvent.js';
import { HttpMethod } from './HttpMethod.js';
import { HttpResponseType } from './HttpResponseType.js';

export interface HttpRequestEvents extends EventMap {
	[HTTPStatusEvent.HTTP_STATUS]: HTTPStatusEvent;
	[Event.COMPLETE]: Event;
	[IOErrorEvent.IO_ERROR]: IOErrorEvent;
	[ProgressEvent.PROGRESS]: ProgressEvent;
}

/**
 * Event-driven XMLHttpRequest wrapper.
 *
 * Use the lifecycle `open()` → `setRequestHeader()` → `send()`. One instance
 * may be reused by calling `open()` for each new request; doing so aborts the
 * previous request and clears headers queued for it.
 */
export class HttpRequest extends EventDispatcher<HttpRequestEvents> {
	// ── Instance fields ───────────────────────────────────────────────────────

	/** Response body representation requested from XMLHttpRequest. */
	public responseType: HttpResponseType = HttpResponseType.TEXT;
	/** Whether cross-origin requests include credentials. */
	public withCredentials = false;
	/** Request timeout in milliseconds; 0 disables the browser timeout. */
	public timeout = 0;

	private _xhr?: XMLHttpRequest;
	private _url = '';
	private _method: HttpMethod = HttpMethod.GET;
	private _pendingHeaders: Array<{ name: string; value: string }> = [];

	// ── Getters ───────────────────────────────────────────────────────────────

	/** Response body from the active or most recently completed request. */
	public get response(): string | ArrayBuffer | undefined {
		return this._xhr?.response;
	}

	/**
	 * HTTP status code from the active or most recently completed request.
	 * Returns 0 before completion, after abort(), or when the browser blocks the
	 * request before a response is available (for example, a failed CORS check).
	 */
	public get status(): number {
		return this._xhr?.status ?? 0;
	}

	// ── Public methods ────────────────────────────────────────────────────────

	/**
	 * Prepare a request URL and method.
	 *
	 * Aborts an active request and discards headers queued for the prior request.
	 */
	public open(url: string, method: HttpMethod = HttpMethod.GET): void {
		this.abort();
		this._url = url;
		this._method = method;
		this._pendingHeaders = [];
	}

	/**
	 * Create and send the underlying XMLHttpRequest.
	 *
	 * Queued headers are applied after the native request is opened and before
	 * its body is sent. Successful responses dispatch HTTP_STATUS followed by
	 * COMPLETE; network errors, timeouts, status 0, and status >= 400 dispatch
	 * IOErrorEvent.IO_ERROR.
	 */
	public send(data?: string | ArrayBuffer | FormData): void {
		const xhr = new XMLHttpRequest();
		this._xhr = xhr;

		xhr.responseType = this.responseType as XMLHttpRequestResponseType;
		xhr.withCredentials = this.withCredentials;
		if (this.timeout > 0) xhr.timeout = this.timeout;

		xhr.onload = () => {
			// `load` only means the request completed — the server may still have
			// responded with an error status (404, 500, ...), or the browser may
			// have blocked the response before it reached the server (status 0,
			// e.g. a failed CORS preflight). Treat both as failures, matching
			// how fetch()-based code typically checks `response.ok`.
			HTTPStatusEvent.dispatchHTTPStatusEvent(this, xhr.status);
			if (xhr.status === 0 || xhr.status >= 400) {
				IOErrorEvent.dispatchIOErrorEvent(this);
			} else {
				this.dispatchEventWith(Event.COMPLETE);
			}
		};
		xhr.onerror = () => {
			IOErrorEvent.dispatchIOErrorEvent(this);
		};
		xhr.ontimeout = () => {
			IOErrorEvent.dispatchIOErrorEvent(this);
		};
		xhr.onprogress = e => {
			ProgressEvent.dispatchProgressEvent(this, ProgressEvent.PROGRESS, e.loaded, e.total);
		};

		xhr.open(this._method, this._url, true);
		for (const header of this._pendingHeaders) {
			xhr.setRequestHeader(header.name, header.value);
		}
		xhr.send(data);
	}

	/** Abort the active native request and clear its response/status accessors. */
	public abort(): void {
		if (this._xhr) {
			this._xhr.abort();
			this._xhr = undefined;
		}
	}

	/** Return all response headers, or an empty string when no response is available. */
	public getAllResponseHeaders(): string {
		return this._xhr?.getAllResponseHeaders() ?? '';
	}

	/**
	 * Queue a request header to be sent with the next `send()` call.
	 *
	 * Must be called after `open()` and before `send()` because the underlying
	 * XMLHttpRequest is created lazily by `send()`.
	 */
	public setRequestHeader(header: string, value: string): void {
		this._pendingHeaders.push({ name: header, value });
	}

	/** Return a named response header, or an empty string when it is unavailable. */
	public getResponseHeader(header: string): string {
		return this._xhr?.getResponseHeader(header) ?? '';
	}
}
