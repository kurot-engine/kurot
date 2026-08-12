import { describe, it, expect } from 'vitest';
import { BlurFilter } from '../src/blakron/filters/BlurFilter.js';
import { ColorMatrixFilter } from '../src/blakron/filters/ColorMatrixFilter.js';
import { GlowFilter } from '../src/blakron/filters/GlowFilter.js';
import { DropShadowFilter } from '../src/blakron/filters/DropShadowFilter.js';

describe('BlurFilter', () => {
	it('setter updates uniforms', () => {
		const f = new BlurFilter();
		f.blurX = 10;
		expect(f.blurX).toBe(10);
		expect((f.uniforms as Record<string, number>).blurX).toBe(10);
	});
});

describe('ColorMatrixFilter', () => {
	it('default is identity matrix', () => {
		const f = new ColorMatrixFilter();
		const m = f.matrix;
		expect(m[0]).toBe(1);
		expect(m[6]).toBe(1);
		expect(m[12]).toBe(1);
		expect(m[18]).toBe(1);
		expect(m[1]).toBe(0);
	});

	it('matrix getter returns copy', () => {
		const f = new ColorMatrixFilter();
		const m1 = f.matrix;
		m1[0] = 999;
		expect(f.matrix[0]).toBe(1); // internal not affected
	});
});

describe('GlowFilter', () => {
	it('color setter updates RGB uniforms', () => {
		const f = new GlowFilter();
		f.color = 0x0000ff;
		expect(f.color).toBe(0x0000ff);
		const c = (f.uniforms as Record<string, { x: number; y: number; z: number }>).color;
		expect(c.x).toBeCloseTo(0, 5);
		expect(c.y).toBeCloseTo(0, 5);
		expect(c.z).toBeCloseTo(1, 5);
	});
});

describe('DropShadowFilter', () => {
	it('angle setter converts to radians in uniform', () => {
		const f = new DropShadowFilter();
		f.angle = 180;
		expect((f.uniforms as Record<string, number>).angle).toBeCloseTo(Math.PI, 10);
	});

	it('extends GlowFilter', () => {
		const f = new DropShadowFilter();
		expect(f).toBeInstanceOf(GlowFilter);
	});
});
