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

	public url: string;
	public method: string = URLRequestMethod.GET;
	public data: string | ArrayBuffer | URLVariables | undefined;
	public requestHeaders: URLRequestHeader[] = [];

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(url = '') {
		this.url = url;
	}
}
