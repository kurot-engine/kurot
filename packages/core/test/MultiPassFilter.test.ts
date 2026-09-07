import { describe, expect, it } from 'vitest';
import { MultiPassFilter } from '../src/kurot/filters/MultiPassFilter.js';
import { BloomFilter } from '../src/kurot/filters/BloomFilter.js';
import { BlurFilter } from '../src/kurot/filters/BlurFilter.js';
import { Sprite } from '../src/kurot/display/Sprite.js';

const blur = new BlurFilter(4, 2);

describe('MultiPassFilter', () => {
	it('rejects cycles, forward references and invalid pass scales', () => {
		expect(() => new MultiPassFilter([])).toThrow();
		expect(() => new MultiPassFilter([{ filter: blur, input: 0 }])).toThrow('earlier pass');
		expect(() => new MultiPassFilter([{ filter: blur, textures: { uMap: 1 } }])).toThrow('earlier pass');
		expect(() => new MultiPassFilter([{ filter: blur, scale: 0 }])).toThrow('scale');
		expect(() => new MultiPassFilter([{ filter: blur, scale: Infinity }])).toThrow('scale');
	});

	it('keeps descriptors immutable and sums effect support', () => {
		const pass = { filter: blur, scale: 0.5 };
		const filter = new MultiPassFilter([pass, { filter: blur }]);
		pass.scale = 1;
		expect(filter.passes[0].scale).toBe(0.5);
		expect(Object.isFrozen(filter.passes)).toBe(true);
		expect(filter.getPadding()).toEqual({ left: 8, right: 8, top: 4, bottom: 4 });
	});

	it('keeps shared child invalidation attached until all users detach', () => {
		const child = new BlurFilter();
		const first = new MultiPassFilter([{ filter: child }]);
		const second = new MultiPassFilter([{ filter: child }]);
		const sprite = new Sprite();
		sprite.filters = [first, second];
		sprite.filters = [second];
		sprite.$renderDirty = false;
		child.blurX = 9;
		expect(sprite.$renderDirty).toBe(true);
	});

	it('validates bloom parameters and propagates child edits', () => {
		expect(() => new BloomFilter({ threshold: 2 })).toThrow();
		expect(() => new BloomFilter({ intensity: -1 })).toThrow();
		const bloom = new BloomFilter();
		const sprite = new Sprite(); sprite.filters = [bloom]; sprite.$renderDirty = false;
		bloom.intensity = 2;
		expect(sprite.$renderDirty).toBe(true);
		bloom.blur = 20;
		expect(bloom.getPadding().left).toBe(20);
	});
});
