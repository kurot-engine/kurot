/**
 * Encapsulates a single HTTP request header as a name/value pair.
 * Used in `URLRequest.requestHeaders`.
 */
export class URLRequestHeader {
	// ── Instance fields ───────────────────────────────────────────────────────

	public name: string;
	public value: string;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(name: string, value: string) {
		this.name = name;
		this.value = value;
	}
}
