import { describe, expect, it } from 'vitest';
import { Component, Rect, Skin, AddItems } from '../src/index.js';

describe('AddItems', () => {
	it('uses the host component when destination is empty', () => {
		const host = new Component();
		const skin = new Skin();
		const prompt = new Rect();
		(skin as unknown as Record<string, unknown>).promptDisplay = prompt;
		const override = new AddItems('promptDisplay', '', -1, 'elementsContent');

		override.apply(host, skin);
		expect(prompt.parent).toBe(host);

		override.remove(host, skin);
		expect(prompt.parent).toBeUndefined();
	});
});
