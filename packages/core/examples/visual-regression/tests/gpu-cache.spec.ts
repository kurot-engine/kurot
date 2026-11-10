import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: updating a bitmap subtree cache stays on the GPU`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { Sprite, Bitmap, BitmapData, Texture, CanvasRenderer, WebGLRenderContext } = h.kurot;
			const source = document.createElement('canvas');
			source.width = source.height = 16;
			const context = source.getContext('2d')!;
			context.fillStyle = '#ff4000';
			context.fillRect(0, 0, 16, 16);
			const texture = new Texture();
			texture.bitmapData = new BitmapData(source);
			texture.initData(0, 0, 16, 16, 0, 0, 16, 16, 16, 16);
			const cached = new Sprite();
			const bitmap = new Bitmap(texture);
			cached.addChild(bitmap);
			h.root.addChild(cached);
			h.render(); // Upload immutable source pixels before measuring cache work.
			let canvasPasses = 0;
			let uploads = 0;
			const drawCounts: boolean[] = [];
			const canvasRender = CanvasRenderer.prototype.renderToContext;
			const createTexture = WebGLRenderContext.prototype.createTexture;
			const updateTexture = WebGLRenderContext.prototype.updateTexture;
			CanvasRenderer.prototype.renderToContext = function (...args) {
				canvasPasses++;
				return canvasRender.apply(this, args);
			};
			WebGLRenderContext.prototype.createTexture = function (...args) {
				uploads++;
				return createTexture.apply(this, args);
			};
			WebGLRenderContext.prototype.updateTexture = function (...args) {
				uploads++;
				return updateTexture.apply(this, args);
			};
			try {
				cached.cacheAsBitmap = true;
				for (let i = 0; i < 3; i++) {
					bitmap.x = i * 4;
					const draws = h.render();
					drawCounts.push(draws === h.app.player.perf.drawCalls);
				}
				return { canvasPasses, uploads, drawCounts, pixel: h.pixel(12, 8), errors: h.errors() };
			} finally {
				CanvasRenderer.prototype.renderToContext = canvasRender;
				WebGLRenderContext.prototype.createTexture = createTexture;
				WebGLRenderContext.prototype.updateTexture = updateTexture;
			}
		});
		expect(result.drawCounts).toEqual([true, true, true]);
		expect(result.pixel).toEqual([255, 64, 0, 255]);
		expect(result.errors).toEqual([]);
		expect(result.canvasPasses).toBe(0);
		expect(result.uploads).toBe(0);
	});

	test(`${backend}: cache refresh reuses unchanged text and graphics uploads`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { Sprite, TextField, WebGLRenderContext } = h.kurot;
			const cached = new Sprite();
			const label = new TextField();
			label.text = 'Shop';
			label.size = 16;
			const icon = new Sprite();
			icon.graphics.beginFill(0xffffff);
			icon.graphics.drawRect(0, 25, 16, 16);
			cached.addChild(label);
			cached.addChild(icon);
			cached.cacheAsBitmap = true;
			h.root.addChild(cached);
			h.render();
			let uploads = 0;
			const update = WebGLRenderContext.prototype.updateTexture;
			WebGLRenderContext.prototype.updateTexture = function (...args) {
				uploads++;
				return update.apply(this, args);
			};
			try {
				for (let i = 0; i < 3; i++) {
					icon.x = i * 2;
					h.render();
				}
				const unchanged = uploads;
				label.text = 'Store';
				h.render();
				return { unchanged, changed: uploads - unchanged, errors: h.errors() };
			} finally {
				WebGLRenderContext.prototype.updateTexture = update;
			}
		});
		expect(result).toEqual({ unchanged: 0, changed: 1, errors: [] });
	});
}
