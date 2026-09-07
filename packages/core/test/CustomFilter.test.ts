import { describe, it, expect } from 'vitest';
import { CustomFilter } from '../src/kurot/filters/CustomFilter.js';
import { Sprite } from '../src/kurot/display/Sprite.js';
import { BitmapData } from '../src/kurot/display/texture/BitmapData.js';

describe('CustomFilter', () => {
	it('does not allow auxiliary textures to replace automatic uniforms', () => {
		const filter = new CustomFilter('', 'source');
		expect(() => filter.setTexture('uSampler', { source: new BitmapData() })).toThrow('reserved');
	});

	it('owns its binding descriptor but not the caller image', () => {
		const source = new BitmapData();
		const binding = { source, smoothing: false };
		const filter = CustomFilter.from({ webgl1: { fragment: 'source' }, textures: { uMap: binding } });
		binding.smoothing = true;
		expect(filter.textures.uMap.smoothing).toBe(false);
		expect(filter.textures.uMap.source).toBe(source);
		filter.setTexture('uMap', undefined);
		expect(filter.textures.uMap).toBeUndefined();
	});

	it('does not collide when concatenated source text matches', () => {
		expect(new CustomFilter('ab', 'c').shaderKey).not.toBe(new CustomFilter('a', 'bc').shaderKey);
	});

	it('invalidates attached owners and detaches replaced filters', () => {
		const filter = new CustomFilter('', 'source');
		const first = new Sprite();
		const second = new Sprite();
		first.filters = [filter];
		second.filters = [filter];
		first.$renderDirty = second.$renderDirty = false;
		filter.setUniform('time', 1);
		expect(first.$renderDirty).toBe(true);
		expect(second.$renderDirty).toBe(true);
		first.filters = [];
		first.$renderDirty = second.$renderDirty = false;
		filter.setUniform('time', 2);
		expect(first.$renderDirty).toBe(false);
		expect(second.$renderDirty).toBe(true);
	});

	it('selects explicit backend sources and rejects missing variants', () => {
		const filter = CustomFilter.from({ webgl1: { fragment: 'source' } });
		expect(filter.$getProgram(false)).toEqual({ fragment: 'source' });
		expect(() => filter.$getProgram(true)).toThrow('has no WebGL 2');
	});

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
