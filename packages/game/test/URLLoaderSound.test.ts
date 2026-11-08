import { Event, Sound } from '@kurot/core';
import { afterEach, expect, it, vi } from 'vitest';
import { URLLoader, URLLoaderDataFormat, URLRequest } from '../src/index.js';

afterEach(() => {
	vi.restoreAllMocks();
});

it('transfers completed sound ownership before a listener reuses the loader', () => {
	const loading: Sound[] = [];
	vi.spyOn(Sound.prototype, 'load').mockImplementation(function (this: Sound) {
		loading.push(this);
	});
	const close = vi.spyOn(Sound.prototype, 'close');
	const loader = new URLLoader();
	loader.dataFormat = URLLoaderDataFormat.SOUND;
	const request = new URLRequest('sample.wav');
	loader.once(Event.COMPLETE, () => {
		expect(loader.data).toBe(loading[0]);
		loader.load(request);
	});
	loader.load(request);
	loading[0].dispatchEventWith(Event.COMPLETE);
	expect(close).not.toHaveBeenCalled();
	loader.close();
	expect(close.mock.contexts).toEqual([loading[1]]);
	expect(loading[0].hasEventListener(Event.COMPLETE)).toBe(false);
});
