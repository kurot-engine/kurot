/**
 * Encapsulates a single HTTP request header as a name/value pair.
 * Used in `URLRequest.requestHeaders`.
 */
export class URLRequestHeader {
	// ── Instance fields ───────────────────────────────────────────────────────

	/**
	 * Header name, e.g. `Content-Type`.
	 */
	public name: string;

	/**
	 * Header value, e.g. `application/json`.
	 */
	public value: string;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(name: string, value: string) {
		this.name = name;
		this.value = value;
	}
}
