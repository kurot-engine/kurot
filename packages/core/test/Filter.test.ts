import { describe, it, expect } from 'vitest';
import { Filter } from '../src/blakron/filters/Filter.js';

describe('Filter (base class)', () => {
	it('can be constructed', () => {
		const f = new Filter();
		expect(f).toBeDefined();
		expect(f.type).toBe('');
	});
});
