import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: a filtered parent preserves its child's blur outside layout bounds`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0xffffff); box.graphics.drawRect(0, 0, 20, 20);
			box.x = box.y = 80; box.filters = [new h.kurot.BlurFilter(8, 8)];
			const parent = new h.kurot.Sprite(); parent.addChild(box); h.root.addChild(parent);
			h.render(); const before = h.pixel(76, 90);
			parent.filters = [new h.kurot.ColorMatrixFilter()];
			h.render();
			return { before, after: h.pixel(76, 90), width: parent.width, errors: h.errors() };
		});
		expect(result.before[3]).toBeGreaterThan(0);
		expect(result.after).toEqual(result.before);
		expect(result.width).toBe(20);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: filters and a mask on the same rotated object compose once`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0xff0000); box.graphics.drawRect(0, 0, 40, 40);
			box.x = box.y = 100; box.rotation = 90; box.alpha = 0.5;
			box.filters = [new h.kurot.ColorMatrixFilter(), new h.kurot.BlurFilter(0, 0)];
			const mask = new h.kurot.Sprite();
			mask.graphics.beginFill(0xffffff); mask.graphics.drawRect(0, 0, 20, 40);
			mask.x = mask.y = 100; mask.rotation = 90;
			h.root.addChild(box); h.root.addChild(mask); box.mask = mask;
			h.render();
			return { inside: h.pixel(80, 110), outside: h.pixel(80, 130), errors: h.errors() };
		});
		expect(result.inside[0]).toBeGreaterThanOrEqual(126);
		expect(result.inside[3]).toBeLessThanOrEqual(128);
		expect(result.outside[3]).toBe(0);
		expect(result.errors).toEqual([]);
	});

	for (const resolution of [1, 2]) {
		test(`${backend} @${resolution}: ordered filters preserve orientation and alpha`, async ({ page }) => {
			await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}&resolution=${resolution}`);
			const result = await page.evaluate(() => {
				const h = window.filterHarness;
				const { Sprite, ColorMatrixFilter } = h.kurot;
				const box = new Sprite();
				box.graphics.beginFill(0x400000);
				box.graphics.drawRect(0, 0, 40, 20);
				box.graphics.beginFill(0x0000ff);
				box.graphics.drawRect(0, 20, 40, 20);
				box.x = box.y = 50;
				h.root.addChild(box);
				const add = new ColorMatrixFilter([1, 0, 0, 0, 64, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]);
				const halve = new ColorMatrixFilter([0.5, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]);
				box.filters = [add, halve];
				h.render();
				const first = h.pixel(65, 60);
				const bottom = h.pixel(65, 80);
				box.filters = [halve, add];
				h.render();
				const reversed = h.pixel(65, 60);
				box.alpha = 0.5;
				box.filters = [new ColorMatrixFilter(), new ColorMatrixFilter()];
				h.render();
				return { first, bottom, reversed, alpha: h.pixel(65, 60)[3], errors: h.errors() };
			});
			expect(result.first[0]).toBeCloseTo(64, 0);
			expect(result.bottom[2]).toBe(255);
			expect(result.reversed[0]).toBeCloseTo(96, 0);
			expect(result.alpha).toBeGreaterThanOrEqual(126);
			expect(result.alpha).toBeLessThanOrEqual(128);
			expect(result.errors).toEqual([]);
		});
	}

	test(`${backend}: blur replaces intermediate pixels rather than blending onto its input`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const box = new h.kurot.Sprite();
			box.graphics.beginFill(0xffffff);
			box.alpha = 0.5;
			box.graphics.drawRect(0, 0, 40, 40);
			box.x = box.y = 80;
			h.root.addChild(box);
			h.render();
			const base = h.pixel(100, 100);
			box.filters = [new h.kurot.BlurFilter(4, 4)];
			h.render();
			return { base, center: h.pixel(100, 100), outside: h.pixel(78, 100), errors: h.errors() };
		});
		expect(result.center).toEqual(result.base);
		expect(result.center[3]).toBeGreaterThanOrEqual(126);
		expect(result.center[3]).toBeLessThanOrEqual(128);
		expect(result.outside[3]).toBeGreaterThan(0);
		expect(result.errors).toEqual([]);
	});

	test(`${backend}: nested filters, scroll clipping and following sprites stay independent`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { Sprite, ColorMatrixFilter, BlurFilter, Rectangle } = h.kurot;
			const outer = new Sprite();
			outer.x = outer.y = 50;
			outer.scaleX = outer.scaleY = 1.5;
			outer.filters = [new ColorMatrixFilter(), new BlurFilter(0, 0)];
			const clip = new Sprite();
			clip.scrollRect = new Rectangle(0, 0, 20, 20);
			const box = new Sprite();
			box.graphics.beginFill(0xff0000);
			box.graphics.drawRect(0, 0, 40, 40);
			box.filters = [new ColorMatrixFilter(), new ColorMatrixFilter()];
			clip.addChild(box);
			outer.addChild(clip);
			h.root.addChild(outer);
			const plain = new Sprite();
			plain.graphics.beginFill(0x00ff00);
			plain.graphics.drawRect(150, 150, 20, 20);
			h.root.addChild(plain);
			h.render();
			return { inside: h.pixel(65, 65), outside: h.pixel(90, 90), plain: h.pixel(160, 160), errors: h.errors() };
		});
		expect(result.inside).toEqual([255, 0, 0, 255]);
		expect(result.outside[3]).toBe(0);
		expect(result.plain).toEqual([0, 255, 0, 255]);
		expect(result.errors).toEqual([]);
	});
}
