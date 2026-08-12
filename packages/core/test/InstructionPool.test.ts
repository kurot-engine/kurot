import { describe, expect, it } from 'vitest';
import { Sprite } from '../src/blakron/display/Sprite.js';
import { Filter } from '../src/blakron/filters/Filter.js';
import { FilterPipe } from '../src/blakron/player/webgl/pipes/FilterPipe.js';
import { MaskPipe } from '../src/blakron/player/webgl/pipes/MaskPipe.js';

describe('effect instruction pools', () => {
	it('clear strong references before pooling filter instructions', () => {
		const obj = new Sprite();
		const push = FilterPipe.makePush(obj, [new Filter()], 0, 0);
		const pop = FilterPipe.makePop(obj, push);
		FilterPipe.releasePush(push);
		FilterPipe.releasePop(pop);

		expect(push.renderable).toBeUndefined();
		expect(push.filters).toEqual([]);
		expect(pop.renderable).toBeUndefined();
		expect(pop.push).toBeUndefined();
	});

	it('clear strong references before pooling mask instructions', () => {
		const obj = new Sprite();
		const push = MaskPipe.makePush(obj, 0, 0);
		const pop = MaskPipe.makePop(obj, push);
		MaskPipe.releasePush(push);
		MaskPipe.releasePop(pop);

		expect(push.renderable).toBeUndefined();
		expect(pop.renderable).toBeUndefined();
		expect(pop.push).toBeUndefined();
	});
});
