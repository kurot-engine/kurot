import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	for (const disable of [false, true]) {
		test(`${backend}: removing a cache (disable=${disable}) clears old pixels before a new object mask`, async ({ page }) => {
			await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
			const result = await page.evaluate(disable => {
				const h = window.filterHarness;
				h.app.player.updateStageSize(256, 256, 256, 256);
				const { Sprite } = h.kurot;
				const old = new Sprite();
				old.graphics.beginFill(0xff0000);
				old.graphics.drawRect(50, 50, 40, 40);
				old.cacheAsBitmap = true;
				h.root.addChild(old);
				h.render();
				if (disable) {
					old.cacheAsBitmap = false;
				}
				h.root.removeChild(old);
				const box = new Sprite();
				box.graphics.beginFill(0x00ff00);
				box.graphics.drawRect(50, 50, 40, 40);
				h.root.addChild(box);
				const mask = new Sprite();
				mask.graphics.beginFill(0xffffff);
				mask.graphics.drawRect(60, 50, 20, 40);
				h.root.addChild(mask);
				box.mask = mask;
				const samples = [];
				for (let frame = 0; frame < 3; frame++) {
					h.render();
					samples.push({ outside: h.pixel(52, 55), inside: h.pixel(65, 55), errors: h.errors() });
				}
				return samples;
			}, disable);
			for (const sample of result) {
				expect(sample).toEqual({ outside: [0, 0, 0, 0], inside: [0, 255, 0, 255], errors: [] });
			}
		});
	}
}
