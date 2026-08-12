import { describe, expect, it } from 'vitest';
import { Texture } from '@kurot/core';
import { ParticleSystem } from '../src/kurot/particle/ParticleSystem.js';

describe('ParticleSystem', () => {
	it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects an unsafe emission rate: %s',
		(rate) => {
			expect(() => new ParticleSystem(new Texture(), rate)).toThrow(RangeError);
		},
	);

	it('preserves Egret-compatible zero as disabled emission', () => {
		const system = new ParticleSystem(new Texture(), 0);
		expect(() => system.start()).not.toThrow();
		expect(system.emissionTime).toBe(-1);
	});

	it('validates emission rate changes after construction', () => {
		const system = new ParticleSystem(new Texture(), 16);
		expect(() => { system.emissionRate = -10; }).toThrow(RangeError);
		expect(system.emissionRate).toBe(16);
	});
});
