import { describe, expect, it } from 'vitest';
import { UI_DOCUMENT_FORMAT_VERSION } from '../src/index.js';

describe('UI document format', () => {
	it('publishes semantic authoring format version 2', () => {
		expect(Number.isInteger(UI_DOCUMENT_FORMAT_VERSION)).toBe(true);
		expect(UI_DOCUMENT_FORMAT_VERSION).toBe(2);
	});
});
