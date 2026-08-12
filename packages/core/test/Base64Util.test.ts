import { describe, it, expect } from 'vitest';
import { Base64Util } from '../src/blakron/utils/Base64Util.js';

function stringToBuffer(str: string): ArrayBuffer {
	return new TextEncoder().encode(str).buffer as ArrayBuffer;
}

function bufferToString(buf: ArrayBuffer): string {
	return new TextDecoder().decode(buf);
}

describe('Base64Util', () => {
	it('encode/decode round-trip ASCII', () => {
		const original = 'Hello, World!';
		const encoded = Base64Util.encode(stringToBuffer(original));
		const decoded = bufferToString(Base64Util.decode(encoded));
		expect(decoded).toBe(original);
	});

	it('encode/decode round-trip binary', () => {
		const bytes = new Uint8Array([0, 1, 2, 127, 128, 255]);
		const encoded = Base64Util.encode(bytes.buffer as ArrayBuffer);
		const decoded = new Uint8Array(Base64Util.decode(encoded));
		expect(Array.from(decoded)).toEqual(Array.from(bytes));
	});

	it('encode empty buffer', () => {
		const encoded = Base64Util.encode(new ArrayBuffer(0));
		expect(encoded).toBe('');
	});

	it('decode empty string', () => {
		const decoded = Base64Util.decode('');
		expect(decoded.byteLength).toBe(0);
	});

	it('padding for 1-byte input', () => {
		const encoded = Base64Util.encode(new Uint8Array([65]).buffer as ArrayBuffer);
		expect(encoded).toBe('QQ==');
	});

	it('padding for 2-byte input', () => {
		const encoded = Base64Util.encode(new Uint8Array([65, 66]).buffer as ArrayBuffer);
		expect(encoded).toBe('QUI=');
	});

	it('no padding for 3-byte input', () => {
		const encoded = Base64Util.encode(new Uint8Array([65, 66, 67]).buffer as ArrayBuffer);
		expect(encoded).toBe('QUJD');
	});
});
