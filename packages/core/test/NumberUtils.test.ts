import { describe, it, expect } from 'vitest';
import { NumberUtils } from '../src/blakron/utils/NumberUtils.js';

describe('NumberUtils', () => {
	it('sin(0) = 0', () => expect(NumberUtils.sin(0)).toBe(0));
	it('sin(90) = 1', () => expect(NumberUtils.sin(90)).toBe(1));
	it('sin(180) = 0', () => expect(NumberUtils.sin(180)).toBe(0));
	it('sin(270) = -1', () => expect(NumberUtils.sin(270)).toBe(-1));

	it('cos(0) = 1', () => expect(NumberUtils.cos(0)).toBe(1));
	it('cos(90) = 0', () => expect(NumberUtils.cos(90)).toBe(0));
	it('cos(180) = -1', () => expect(NumberUtils.cos(180)).toBe(-1));
	it('cos(270) = 0', () => expect(NumberUtils.cos(270)).toBe(0));

	it('sin/cos non-integer angle approximates Math.sin/cos', () => {
		const deg = 45.5;
		const rad = (deg * Math.PI) / 180;
		expect(NumberUtils.sin(deg)).toBeCloseTo(Math.sin(rad), 2);
		expect(NumberUtils.cos(deg)).toBeCloseTo(Math.cos(rad), 2);
	});

	it('sin/cos negative angle', () => {
		expect(NumberUtils.sin(-90)).toBeCloseTo(NumberUtils.sin(270), 10);
		expect(NumberUtils.cos(-90)).toBeCloseTo(NumberUtils.cos(270), 10);
	});

	it('isNumber returns true for numbers', () => {
		expect(NumberUtils.isNumber(0)).toBe(true);
		expect(NumberUtils.isNumber(3.14)).toBe(true);
		expect(NumberUtils.isNumber(-1)).toBe(true);
	});

	it('isNumber returns false for NaN/non-numbers', () => {
		expect(NumberUtils.isNumber(NaN)).toBe(false);
		expect(NumberUtils.isNumber('5')).toBe(false);
		expect(NumberUtils.isNumber(undefined)).toBe(false);
		expect(NumberUtils.isNumber(null)).toBe(false);
	});

	it('convertStringToHashCode same string same hash', () => {
		const h1 = NumberUtils.convertStringToHashCode('hello');
		const h2 = NumberUtils.convertStringToHashCode('hello');
		expect(h1).toBe(h2);
	});

	it('convertStringToHashCode different strings different hash', () => {
		const h1 = NumberUtils.convertStringToHashCode('hello');
		const h2 = NumberUtils.convertStringToHashCode('world');
		expect(h1).not.toBe(h2);
	});

	it('convertStringToHashCode empty string', () => {
		expect(NumberUtils.convertStringToHashCode('')).toBe(0);
	});
});
