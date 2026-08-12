import { describe, it, expect } from 'vitest';
import { CustomFilter } from '../src/blakron/filters/CustomFilter.js';

describe('CustomFilter', () => {
	it('generates a shaderKey', () => {
		const f = new CustomFilter('v', 'f');
		expect(f.shaderKey).toBeDefined();
		expect(typeof f.shaderKey).toBe('string');
		expect(f.shaderKey.length).toBeGreaterThan(0);
	});

	it('same vertex+fragment gets same shaderKey', () => {
		const f1 = new CustomFilter('a', 'b');
		const f2 = new CustomFilter('a', 'b');
		expect(f1.shaderKey).toBe(f2.shaderKey);
	});

	it('different vertex+fragment gets different shaderKey', () => {
		const f1 = new CustomFilter('a', 'b');
		const f2 = new CustomFilter('c', 'd');
		expect(f1.shaderKey).not.toBe(f2.shaderKey);
	});

	it('padding setter updates all edges', () => {
		const f = new CustomFilter('v', 'f');
		f.padding = 5;
		expect(f.padding).toBe(5);
		const p = f.getPadding();
		expect(p.left).toBe(5);
		expect(p.right).toBe(5);
		expect(p.top).toBe(5);
		expect(p.bottom).toBe(5);
	});
});
