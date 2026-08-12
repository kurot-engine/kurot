/**
 * Base64 encode/decode for `ArrayBuffer`. Wraps the browser's native
 * `btoa` / `atob` (universally supported since 2014); the previous hand-rolled
 * bit-twiddling implementation was an ES5-era fallback for old IE.
 */
export class Base64Util {
	/**
	 * Encode an `ArrayBuffer` to a base64 string.
	 * Converts bytes to a binary string in chunks (to avoid launching a
	 * single `String.fromCharCode` apply with tens of thousands of args) and
	 * hands the result to native `btoa`.
	 */
	public static encode(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		const len = bytes.length;
		if (len === 0) return '';

		// Build the binary string in 8KB chunks to stay within argument limits.
		const CHUNK = 0x2000;
		let binary = '';
		for (let i = 0; i < len; i += CHUNK) {
			binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
		}
		return btoa(binary);
	}

	/**
	 * Decode a base64 string into an `ArrayBuffer`. Uses native `atob` and
	 * char-code expansion.
	 */
	public static decode(base64: string): ArrayBuffer {
		if (base64.length === 0) return new ArrayBuffer(0);
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes.buffer;
	}
}
