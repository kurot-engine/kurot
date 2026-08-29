import { describe, expect, it } from 'vitest';
import { UI_DOCUMENT_FORMAT_VERSION } from '../src/index.js';

describe('UI document format', () => {
	it('publishes a positive integer format version', () => {
		expect(Number.isInteger(UI_DOCUMENT_FORMAT_VERSION)).toBe(true);
		expect(UI_DOCUMENT_FORMAT_VERSION).toBeGreaterThan(0);
	});
});
