/**
 * URLVariables allows transferring variables between an application and a server.
 *
 * Assign an instance to `URLRequest.data`: for GET requests it's appended to
 * the URL's query string, for POST requests it's sent as
 * `application/x-www-form-urlencoded` (via `toString()`). `URLLoader` handles
 * both cases automatically.
 *
 * Egret-compatible: egret.URLVariables
 */
export class URLVariables {
	/** Key-value pairs stored in this object. */
	variables: Record<string, string | string[]> = {};

	constructor(source?: string) {
		if (source) this.decode(source);
	}

	/**
	 * Parse a URL-encoded query string into this.variables.
	 */
	decode(source: string): void {
		source = source.split('+').join(' ');
		const re = /[?&]?([^=]+)=([^&]*)/g;
		let tokens: RegExpExecArray | null;
		while ((tokens = re.exec(source)) !== null) {
			const key = decodeURIComponent(tokens[1]);
			const val = decodeURIComponent(tokens[2]);
			const existing = this.variables[key];
			if (existing === undefined) {
				this.variables[key] = val;
			} else if (Array.isArray(existing)) {
				existing.push(val);
			} else {
				this.variables[key] = [existing, val];
			}
		}
	}

	/**
	 * Returns a URL-encoded string of all variables.
	 */
	toString(): string {
		const parts: string[] = [];
		for (const key in this.variables) {
			const value = this.variables[key];
			if (Array.isArray(value)) {
				for (const v of value) {
					parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
				}
			} else {
				parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
			}
		}
		return parts.join('&');
	}
}
