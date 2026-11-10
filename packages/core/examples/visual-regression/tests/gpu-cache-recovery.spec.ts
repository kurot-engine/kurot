import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: failed nested captures recover without retaining partial pixels`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { Sprite, CustomFilter } = h.kurot;
			const outer = new Sprite();
			const inner = new Sprite();
			const good = new Sprite();
			good.graphics.beginFill(0x00ff00);
			good.graphics.drawRect(0, 0, 20, 20);
			const bad = new Sprite();
			bad.graphics.beginFill(0xff0000);
			bad.graphics.drawRect(30, 0, 20, 20);
			inner.addChild(good);
			inner.addChild(bad);
			outer.addChild(inner);
			h.root.addChild(outer);
			outer.cacheAsBitmap = inner.cacheAsBitmap = good.cacheAsBitmap = true;
			h.render();
			bad.filters = [new CustomFilter('', 'invalid shader')];
			good.alpha = 0.5;
			let error = '';
			try {
				h.render();
			} catch (cause) {
				error = String(cause);
			}
			bad.filters = [];
			const recoveredDraws = h.render();
			const recovered = [h.pixel(10, 10), h.pixel(40, 10)];
			const counted = recoveredDraws === h.app.player.perf.drawCalls;
			good.alpha = 1;
			h.render();
			const updated = h.pixel(10, 10);
			h.render();
			return { error, recovered, updated, steady: h.pixel(10, 10), counted, errors: h.errors() };
		});
		expect(result.error).toContain('Shader compile failed');
		expect(result.recovered).toEqual([[0, 128, 0, 128], [255, 0, 0, 255]]);
		expect(result.updated).toEqual([0, 255, 0, 255]);
		expect(result.steady).toEqual(result.updated);
		expect(result.counted).toBe(true);
		expect(result.errors).toEqual([]);
	});
}
