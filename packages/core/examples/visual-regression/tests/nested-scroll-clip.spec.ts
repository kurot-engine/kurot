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

for (const backend of ['webgl1', 'webgl2']) {
	for (const resolution of [1, 2]) {
		test(`${backend} ${resolution}x: fractional viewports retain complete nine-slice edges`, async ({ page }) => {
			await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}&resolution=${resolution}`);
			const result = await page.evaluate(resolution => {
				const h = window.filterHarness;
				h.app.player.updateStageSize(256, 256, 256 * resolution, 256 * resolution);
				h.render();
				const { Sprite, Bitmap, BitmapData, Texture, Rectangle } = h.kurot;
				const source = document.createElement('canvas');
				source.width = source.height = 96;
				const context = source.getContext('2d')!;
				context.scale(2, 2);
				context.fillStyle = '#e4f2ff';
				context.strokeStyle = '#1487e8';
				context.lineWidth = 1;
				context.beginPath();
				context.roundRect(0.5, 0.5, 47, 47, 14);
				context.fill();
				context.stroke();
				const texture = new Texture(2);
				texture.bitmapData = new BitmapData(source);
				texture.initData(0, 0, 96, 96, 0, 0, 96, 96, 96, 96);
				const viewport = new Sprite();
				const bitmap = new Bitmap(texture);
				bitmap.width = 232;
				bitmap.height = 48;
				bitmap.scale9Grid = new Rectangle(16, 16, 16, 16);
				viewport.addChild(bitmap);
				h.root.addChild(viewport);
				const capture = (): Uint8Array => {
					h.render();
					const pixels = new Uint8Array(256 * 256 * resolution * resolution * 4);
					h.gl.bindFramebuffer(h.gl.FRAMEBUFFER, null);
					h.gl.readPixels(0, 0, 256 * resolution, 256 * resolution,
						h.gl.RGBA, h.gl.UNSIGNED_BYTE, pixels);
					return pixels;
				};
				const checks = [];
				for (const [scale, x, y] of [[0.971875, 12.3125, 18.7], [1, 12.7, 18.2], [-0.971875, 240.7, 18.7]]) {
					viewport.scaleX = scale;
					viewport.scaleY = 0.9;
					viewport.x = x;
					viewport.y = y;
					for (const scroll of [0, 13]) {
						viewport.scrollRect = undefined;
						bitmap.x = bitmap.y = 0;
						const full = capture();
						bitmap.x = bitmap.y = scroll;
						viewport.scrollRect = new Rectangle(scroll, scroll, 232, 48);
						const clipped = capture();
						let lost = 0;
						let extra = 0;
						let ink = 0;
						for (let i = 3; i < full.length; i += 4) {
							if (full[i] - clipped[i] > 8) lost++;
							if (clipped[i] - full[i] > 8) extra++;
							if (clipped[i] > 16) ink++;
						}
						checks.push({ scale, scroll, lost, extra, ink });
					}
				}
				return { checks, errors: h.errors() };
			}, resolution);
			for (const check of result.checks) {
				expect(check.lost, JSON.stringify(check)).toBe(0);
				expect(check.extra, JSON.stringify(check)).toBe(0);
				expect(check.ink).toBeGreaterThan(0);
			}
			expect(result.errors).toEqual([]);
		});
	}
}
