import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: glow preserves the object and knockout removes it`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { Sprite, GlowFilter, DropShadowFilter } = h.kurot;
			const box = new Sprite();
			box.graphics.beginFill(0xffffff);
			box.graphics.drawRect(0, 0, 40, 40);
			box.x = box.y = 60;
			h.root.addChild(box);
			const glow = new GlowFilter(0xff0000, 1, 6, 6);
			box.filters = [glow];
			h.render();
			const normal = h.pixel(80, 80);
			const halo = h.pixel(58, 80);
			glow.knockout = true;
			h.render();
			const knockout = h.pixel(80, 80);
			glow.inner = true;
			h.render();
			const innerOutside = h.pixel(58, 80);
			const shadow = new DropShadowFilter(10, 0, 0xff0000, 1, 2, 2);
			box.filters = [shadow];
			h.render();
			const shadowObject = h.pixel(65, 80);
			shadow.hideObject = true;
			h.render();
			return { normal, halo, knockout, innerOutside, shadowObject, hidden: h.pixel(65, 80), errors: h.errors() };
		});
		expect(result.normal).toEqual([255, 255, 255, 255]);
		expect(result.halo[0]).toBeGreaterThan(0);
		expect(result.halo[3]).toBeGreaterThan(0);
		expect(result.knockout[3]).toBeLessThan(2);
		expect(result.innerOutside[3]).toBeLessThan(2);
		expect(result.shadowObject).toEqual([255, 255, 255, 255]);
		expect(result.hidden[3]).toBeLessThan(2);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: blur quality executes extra pass pairs`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0xffffff);
			box.graphics.drawRect(30, 30, 30, 30);
			const blur = new h.kurot.BlurFilter(8, 8, 1);
			box.filters = [blur];
			h.root.addChild(box);
			const first = h.render();
			blur.quality = 3;
			const third = h.render();
			return { first, third, errors: h.errors() };
		});
		expect(result.third - result.first).toBe(4);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: shader errors identify source and leave the renderer usable`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const sources = h.shaders;
			let error = '';
			try {
				h.createProgram(h.gl, sources.default_vert, 'broken fragment', 'broken-test');
			} catch (cause) {
				error = String(cause);
			}
			const good = h.createProgram(h.gl, sources.default_vert, sources.texture_frag, 'valid-test');
			h.gl.deleteProgram(good);
			return { error, errors: h.errors() };
		});
		expect(result.error).toContain('broken-test, fragment');
		expect(result.error).toContain('1: broken fragment');
		expect(result.errors).toEqual([]);
	});
}
