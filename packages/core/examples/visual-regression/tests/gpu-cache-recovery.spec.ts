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
			good.updateCacheTexture();
			let error = '';
			try {
				h.render();
			} catch (cause) {
				error = String(cause);
			}
			const invalidated = [outer, inner, good].map(owner => owner.$displayList!.$gpuCache!.valid);
			bad.filters = [];
			const recoveredDraws = h.render();
			const recovered = [h.pixel(10, 10), h.pixel(40, 10)];
			const counted = recoveredDraws === h.app.player.perf.drawCalls;
			good.alpha = 1;
			h.render();
			const updated = h.pixel(10, 10);
			h.render();
			return { error, invalidated, recovered, updated, steady: h.pixel(10, 10), counted, errors: h.errors() };
		});
		expect(result.error).toContain('Shader compile failed');
		expect(result.invalidated).toEqual([false, false, false]);
		expect(result.recovered).toEqual([[0, 128, 0, 128], [255, 0, 0, 255]]);
		expect(result.updated).toEqual([0, 255, 0, 255]);
		expect(result.steady).toEqual(result.updated);
		expect(result.counted).toBe(true);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: context loss during a cache draw does not commit an empty capture`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(async () => {
			const h = window.filterHarness;
			const cached = new h.kurot.Sprite();
			const leaf = new h.kurot.Sprite();
			leaf.graphics.beginFill(0x00ff00);
			leaf.graphics.drawRect(10, 10, 20, 20);
			cached.addChild(leaf);
			cached.cacheAsBitmap = true;
			h.root.addChild(cached);
			h.render();
			const extension = h.gl.getExtension('WEBGL_lose_context')!;
			const canvas = h.gl.canvas;
			const lost = new Promise(resolve => canvas.addEventListener('webglcontextlost', resolve, { once: true }));
			const draw = h.gl.drawElements.bind(h.gl);
			let lose = true;
			h.gl.drawElements = (...args): void => {
				if (lose) {
					lose = false;
					extension.loseContext();
				}
				draw(...args);
			};
			leaf.alpha = 0.5;
			h.render();
			const validAfterLostDraw = cached.$displayList!.$gpuCache!.valid;
			h.gl.drawElements = draw;
			await lost;
			h.errors();
			await new Promise(resolve => setTimeout(resolve, 30));
			const restored = new Promise(resolve => canvas.addEventListener('webglcontextrestored', resolve, { once: true }));
			extension.restoreContext();
			await restored;
			h.render();
			const recovered = h.pixel(20, 20);
			h.render();
			return { validAfterLostDraw, recovered, stable: h.pixel(20, 20), errors: h.errors() };
		});
		expect(result).toEqual({ validAfterLostDraw: false, recovered: [0, 128, 0, 128], stable: [0, 128, 0, 128], errors: [] });
	});
}
