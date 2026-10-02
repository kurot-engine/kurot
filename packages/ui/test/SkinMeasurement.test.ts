import { describe, expect, it } from 'vitest';
import { Rectangle } from '@kurot/core';
import { Image, ToggleSwitch } from '../src/index.js';
import { attachSkin } from './helpers/skin.js';

describe('Component skin measurement coordinates', () => {
	it.each([0.6, 2, -0.6])('keeps implicit skin dimensions local at scale %s', scale => {
		const toggle = new ToggleSwitch();
		toggle.scaleX = scale;
		toggle.scaleY = scale;
		const background = new Image();
		background.width = 100;
		background.height = 60;
		attachSkin(toggle, { background });
		toggle.validateNow();
		expect(toggle.width).toBe(100);
		expect(toggle.height).toBe(60);
		const bounds = new Rectangle();
		toggle.getLayoutBounds(bounds);
		expect(bounds.width).toBeCloseTo(100 * Math.abs(scale));
		expect(bounds.height).toBeCloseTo(60 * Math.abs(scale));
	});

	it('rotation, skew and anchors affect placement without changing the measured skin size', () => {
		const toggle = new ToggleSwitch();
		toggle.rotation = 30;
		toggle.skewX = 15;
		toggle.anchorOffsetX = 20;
		const background = new Image();
		background.width = 100;
		background.height = 60;
		attachSkin(toggle, { background });
		toggle.validateNow();
		expect(toggle.width).toBe(100);
		expect(toggle.height).toBe(60);
		toggle.scaleX = 0.6;
		toggle.invalidateSize();
		toggle.validateNow();
		expect(toggle.width).toBe(100);
		expect(toggle.height).toBe(60);
	});

	it('skin limits and explicit host dimensions retain their local units', () => {
		const toggle = new ToggleSwitch();
		toggle.scaleX = 0.6;
		toggle.scaleY = 0.6;
		const background = new Image();
		background.width = 100;
		background.height = 60;
		const skin = attachSkin(toggle, { background });
		skin.maxWidth = 80;
		skin.minHeight = 75;
		toggle.invalidateSize();
		toggle.validateNow();
		expect(toggle.width).toBe(80);
		expect(toggle.height).toBe(75);
		toggle.width = 120;
		toggle.height = 90;
		toggle.validateNow();
		expect(toggle.width).toBe(120);
		expect(toggle.height).toBe(90);
	});
});
