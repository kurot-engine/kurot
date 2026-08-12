import type { URLRequestHeader } from './URLRequestHeader.js';
import { URLRequestMethod } from './URLRequestMethod.js';
import type { URLVariables } from './URLVariables.js';

/**
 * Captures all information in a single HTTP request, Egret-compatible.
 *
 * @example
 * ```ts
 * const req = new URLRequest('https://example.com/data.json');
 * req.method = URLRequestMethod.POST;
 * req.data = JSON.stringify({ key: 'value' });
 * req.requestHeaders.push(new URLRequestHeader('Content-Type', 'application/json'));
 * ```
 */
export class URLRequest {
	// ── Instance fields ───────────────────────────────────────────────────────

	/**
	 * The request URL.
	 */
	public url: string;

	/**
	 * HTTP method. Default: `URLRequestMethod.GET`.
	 */
	public method: string = URLRequestMethod.GET;

	/**
	 * Request body data.
	 *
	 * Passing a `URLVariables` instance sends it as
	 * `application/x-www-form-urlencoded` (via `toString()`) for POST requests,
	 * and appends it to the URL's query string for GET requests, unless a
	 * `Content-Type` header is already present in `requestHeaders`.
	 */
	public data: string | ArrayBuffer | URLVariables | undefined;

	/**
	 * Additional HTTP request headers.
	 */
	public requestHeaders: URLRequestHeader[] = [];

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(url = '') {
		this.url = url;
	}
}
