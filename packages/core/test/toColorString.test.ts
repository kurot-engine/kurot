import { describe, it, expect } from 'vitest';
import { toColorString } from '../src/blakron/utils/toColorString.js';

describe('toColorString', () => {
	it('red', () => expect(toColorString(0xff0000)).toBe('#FF0000'));
	it('black', () => expect(toColorString(0x000000)).toBe('#000000'));
	it('white', () => expect(toColorString(0xffffff)).toBe('#FFFFFF'));
	it('pads short values', () => expect(toColorString(0x0000ff)).toBe('#0000FF'));
	it('clamps negative to 0', () => expect(toColorString(-1)).toBe('#000000'));
	it('clamps overflow', () => expect(toColorString(0x1ffffff)).toBe('#FFFFFF'));
	it('handles NaN/undefined as 0', () => expect(toColorString(NaN)).toBe('#000000'));
});
