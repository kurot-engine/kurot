import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	for (const resolution of [1, 2]) {
		test(`${backend} ${resolution}x: cached composition preserves nested transforms, clipping and effects`, async ({ page }) => {
			await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}&resolution=${resolution}`);
			const results = await page.evaluate(resolution => {
				const h = window.filterHarness;
				h.app.player.updateStageSize(256, 256, 256 * resolution, 256 * resolution);
				const { Sprite, Rectangle, ColorMatrixFilter, BlurFilter, Bitmap, BitmapData, Texture } = h.kurot;
				const canvas = document.querySelector<HTMLCanvasElement>('#filters')!;
				const capture = (): Uint8Array => {
					h.render();
					const bytes = new Uint8Array(canvas.width * canvas.height * 4);
					h.gl.bindFramebuffer(h.gl.FRAMEBUFFER, null);
					h.gl.readPixels(0, 0, canvas.width, canvas.height, h.gl.RGBA, h.gl.UNSIGNED_BYTE, bytes);
					return bytes;
				};
				const compare = (a: Uint8Array, b: Uint8Array): number => {
					let differences = 0;
					for (let i = 0; i < a.length; i++) {
						if (Math.abs(a[i] - b[i]) > 2) {
							differences++;
						}
					}
					return differences;
				};
				const checks = [];
				for (const mode of ['nested', 'scroll', 'rectangle', 'object-mask', 'filters', 'outer-filter']) {
					const outer = new Sprite();
					outer.x = 150;
					outer.y = 50;
					outer.rotation = 90;
					outer.scaleX = -1;
					outer.anchorOffsetX = 3;
					outer.alpha = 0.7;
					const inner = new Sprite();
					inner.x = -10;
					inner.y = 8;
					inner.isRenderGroup = true;
					const tile = (color: string, y: number): InstanceType<typeof Bitmap> => {
						const source = document.createElement('canvas');
						source.width = 40;
						source.height = 20;
						const context = source.getContext('2d')!;
						context.fillStyle = color;
						context.fillRect(0, 0, 40, 20);
						const texture = new Texture();
						texture.bitmapData = new BitmapData(source);
						texture.initData(0, 0, 40, 20, 0, 0, 40, 20, 40, 20);
						const bitmap = new Bitmap(texture);
						bitmap.x = -8;
						bitmap.y = y;
						return bitmap;
					};
					const top = tile('#ff4000', -4);
					const bottom = tile('#2040ff', 16);
					inner.addChild(top);
					inner.addChild(bottom);
					outer.addChild(inner);
					h.root.addChild(outer);
					if (mode === 'scroll') {
						outer.scrollRect = new Rectangle(-10, 5, 32, 36);
						inner.scrollRect = new Rectangle(2, 3, 28, 30);
					} else if (mode === 'rectangle') {
						inner.mask = new Rectangle(-3, 2, 27, 26);
					} else if (mode === 'object-mask') {
						const mask = new Sprite();
						mask.graphics.beginFill(0xffffff);
						mask.graphics.drawRect(-6, 0, 25, 25);
						mask.x = inner.x;
						mask.y = inner.y;
						outer.addChild(mask);
						inner.mask = mask;
					} else if (mode === 'filters') {
						inner.filters = [new BlurFilter(4, 4), new ColorMatrixFilter()];
					} else if (mode === 'outer-filter') {
						outer.filters = [new ColorMatrixFilter()];
					}
					const expected = capture();
					outer.cacheAsBitmap = true;
					inner.cacheAsBitmap = true;
					const cached = capture();
					const steady = capture();
					top.tint = 0x80ffff;
					top.x = 3;
					bottom.visible = false;
					const changed = capture();
					outer.cacheAsBitmap = false;
					inner.cacheAsBitmap = false;
					const changedExpected = capture();
					checks.push({ mode, initial: compare(expected, cached), stable: compare(cached, steady), changed: compare(changedExpected, changed), ink: cached.some(n => n > 0), errors: h.errors() });
					h.root.removeChild(outer);
				}
				return checks;
			}, resolution);
			for (const result of results) {
				expect(result, JSON.stringify(result)).toMatchObject({ initial: 0, stable: 0, changed: 0, ink: true, errors: [] });
			}
		});
	}

	test(`${backend}: repeated descendant changes propagate through ordinary and cached containers`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { Sprite } = h.kurot;
			const outer = new Sprite();
			const middle = new Sprite();
			const inner = new Sprite();
			const leaf = new Sprite();
			leaf.graphics.beginFill(0xffffff);
			leaf.graphics.drawRect(0, 0, 20, 20);
			inner.addChild(leaf);
			middle.addChild(inner);
			outer.addChild(middle);
			h.root.addChild(outer);
			outer.cacheAsBitmap = inner.cacheAsBitmap = true;
			const alpha = [];
			for (const value of [1, 0.5, 0.75, 1]) {
				leaf.alpha = value;
				h.render();
				alpha.push(h.pixel(10, 10)[3]);
			}
			inner.removeChild(leaf);
			h.render();
			const empty = h.pixel(10, 10);
			inner.addChild(leaf);
			h.render();
			return { alpha, empty, restored: h.pixel(10, 10), errors: h.errors() };
		});
		expect(result.alpha).toEqual([255, 128, 191, 255]);
		expect(result.empty).toEqual([0, 0, 0, 0]);
		expect(result.restored).toEqual([255, 255, 255, 255]);
		expect(result.errors).toEqual([]);
	});
}
