import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: a nested scroll clip limits progress fill`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { Sprite, Rectangle } = h.kurot;
			const outer = new Sprite();
			outer.x = outer.y = 40;
			outer.scrollRect = new Rectangle(0, 0, 120, 40);
			const track = new Sprite();
			track.graphics.beginFill(0xffffff);
			track.graphics.drawRect(10, 10, 100, 20);
			outer.addChild(track);
			const fill = new Sprite();
			fill.x = fill.y = 10;
			fill.scrollRect = new Rectangle(0, 0, 65, 20);
			const color = new Sprite();
			color.graphics.beginFill(0x0077ff);
			color.graphics.drawRect(0, 0, 100, 20);
			fill.addChild(color);
			outer.addChild(fill);
			h.root.addChild(outer);
			h.render();
			h.gl.bindFramebuffer(h.gl.FRAMEBUFFER, null);
			return {
				stencilBits: h.gl.getParameter(h.gl.STENCIL_BITS) as number,
				filled: h.pixel(60, 60),
				unfilled: h.pixel(130, 60),
				outside: h.pixel(170, 60),
				errors: h.errors(),
			};
		});
		expect(result.stencilBits).toBeGreaterThan(0);
		expect(result.filled).toEqual([0, 119, 255, 255]);
		expect(result.unfilled).toEqual([255, 255, 255, 255]);
		expect(result.outside[3]).toBe(0);
		expect(result.errors).toEqual([]);
	});
}
