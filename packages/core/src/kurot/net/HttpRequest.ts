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

	/**
	 * Body representation for the next send(), defaulting to TEXT. ARRAY_BUFFER requests
	 * an ArrayBuffer. This does not parse JSON or validate its application schema.
	 */
	public responseType: HttpResponseType = HttpResponseType.TEXT;
	/**
	 * Whether the next cross-origin request includes credentials; defaults to false.
	 * Server/browser CORS rules still apply; request failure dispatches IO_ERROR.
	 */
	public withCredentials = false;
	/**
	 * Browser request timeout in milliseconds; defaults to 0 (no timeout). Only
	 * positive values are assigned to the native request. A timeout dispatches IO_ERROR.
	 */
	public timeout = 0;

	private _xhr?: XMLHttpRequest;
	private _url = '';
	private _method: HttpMethod = HttpMethod.GET;
	private _pendingHeaders: Array<{ name: string; value: string }> = [];

	// ── Getters ───────────────────────────────────────────────────────────────

	/**
	 * Native response body, or undefined before send()/after abort(). Inspect only
	 * after COMPLETE. A generic application cast does not parse or validate JSON.
	 */
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
	 * Prepare an asynchronous request URL and method (GET by default). Aborts any
	 * active request and discards previously queued headers. Does not send until
	 * send(); native URL/header/send errors may throw synchronously at that step.
	 */
	public open(url: string, method: HttpMethod = HttpMethod.GET): void {
		this.abort();
		this._url = url;
		this._method = method;
		this._pendingHeaders = [];
	}

	/**
	 * Send after open() and optional setRequestHeader(). COMPLETE reports a successful
	 * load; IO_ERROR reports network failure, timeout, status 0 or HTTP status >=400.
	 * A native load first emits HTTP_STATUS, including error status codes. Native
	 * setup/send errors can throw synchronously; register event handlers before calling.
	 * Call open() for each new request; repeated send() alone does not abort a prior
	 * native request. Abort owned work and remove listeners when the view closes.
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

	/**
	 * Abort the active native request and clear this wrapper's response/status
	 * access. Does not dispatch COMPLETE or remove application event listeners;
	 * remove those separately on view disposal. Repeated calls are harmless.
	 */
	public abort(): void {
		if (this._xhr) {
			this._xhr.abort();
			this._xhr = undefined;
		}
	}

	/**
	 * Return native response headers, or an empty string before a request exists.
	 * Only browser/CORS-exposed headers are readable.
	 */
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

	/**
	 * Return a named browser-exposed response header, or an empty string if absent.
	 * Header access remains subject to native XMLHttpRequest/CORS behavior.
	 */
	public getResponseHeader(header: string): string {
		return this._xhr?.getResponseHeader(header) ?? '';
	}
}
