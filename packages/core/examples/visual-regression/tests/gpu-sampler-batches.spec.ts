import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: eight-to-one texture batches stay isolated across nested caches and effects`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const results = await page.evaluate(() => {
			const h = window.filterHarness;
			h.app.player.updateStageSize(256, 256, 256, 256);
			const { Sprite, Bitmap, Texture, BitmapData, ColorMatrixFilter } = h.kurot;
			const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffffff, 0xffff00, 0x00ffff, 0xff00ff, 0x808080];
			const textures = colors.map(color => {
				const canvas = document.createElement('canvas');
				canvas.width = canvas.height = 8;
				const context = canvas.getContext('2d')!;
				context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
				context.fillRect(0, 0, 8, 8);
				const texture = new Texture();
				texture.setBitmapData(new BitmapData(canvas));
				return texture;
			});
			const rows = Array.from({ length: 8 }, (_, index) => {
				const owner = new Sprite();
				owner.x = 8 + (index % 2) * 128;
				owner.y = 8 + Math.floor(index / 2) * 56;
				const inner = new Sprite();
				const icons = textures.map((texture, i) => {
					const bitmap = new Bitmap(texture);
					bitmap.x = i * 12;
					inner.addChild(bitmap);
					return bitmap;
				});
				owner.addChild(inner);
				if (index % 3 !== 0) {
					inner.filters = [new ColorMatrixFilter()];
				}
				if (index % 3 === 2) {
					const mask = new Sprite();
					mask.graphics.beginFill(0xffffff);
					mask.graphics.drawRect(0, 0, 96, 8);
					owner.addChild(mask);
					inner.mask = mask;
				}
				owner.cacheAsBitmap = inner.cacheAsBitmap = true;
				h.root.addChild(owner);
				return { owner, inner, icons };
			});
			const results = [];
			for (const [generation, count] of [8, 1, 4, 2, 8, 1].entries()) {
				for (const row of rows) {
					row.icons.forEach((icon, i) => {
						icon.visible = i < count;
						icon.texture = textures[(i + generation) % 8];
					});
				}
				for (const phase of ['changed', 'stable']) {
					h.render();
					const mismatches = [];
					for (const [rowIndex, row] of rows.entries()) {
						for (let i = 0; i < 8; i++) {
							const color = colors[(i + generation) % 8];
							const expected = i < count ? [color >> 16, (color >> 8) & 255, color & 255, 255] : [0, 0, 0, 0];
							const actual = h.pixel(row.owner.x + i * 12 + 4, row.owner.y + 4);
							if (actual.some((value, channel) => value !== expected[channel])) {
								mismatches.push({ rowIndex, i, expected, actual });
							}
						}
					}
					results.push({ count, phase, mismatches, errors: h.errors() });
				}
			}
			return results;
		});
		for (const result of results) {
			expect(result, JSON.stringify(result)).toMatchObject({ mismatches: [], errors: [] });
		}
	});
}
