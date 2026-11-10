import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: six independent caches retain pixels after consecutive updates`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			h.app.player.updateStageSize(256, 256, 256, 256);
			const { Sprite, Bitmap, BitmapData, Texture } = h.kurot;
			const texture = (color: string): InstanceType<typeof Texture> => {
				const source = document.createElement('canvas');
				source.width = source.height = 24;
				const context = source.getContext('2d')!;
				context.fillStyle = color;
				context.fillRect(0, 0, 24, 24);
				const value = new Texture();
				value.setBitmapData(new BitmapData(source));
				return value;
			};
			const white = texture('#ffffff');
			const red = texture('#ff0000');
			const green = texture('#00ff00');
			const rows = Array.from({ length: 6 }, (_, i) => {
				const owner = new Sprite();
				const bitmap = new Bitmap(white);
				owner.x = 8 + i * 36;
				owner.y = 10;
				owner.addChild(bitmap);
				owner.cacheAsBitmap = true;
				h.root.addChild(owner);
				return { owner, bitmap };
			});
			const sample = () => {
				h.render();
				return { pixels: rows.map((_, i) => h.pixel(16 + i * 36, 18)), errors: h.errors() };
			};
			const initial = sample();
			const updates = [];
			for (const source of [red, green, white, red]) {
				for (const row of rows) {
					row.bitmap.texture = source;
				}
				updates.push({ changed: sample(), stable: sample() });
			}
			return { initial, updates };
		});
		expect(result.initial).toEqual({ pixels: Array(6).fill([255, 255, 255, 255]), errors: [] });
		for (const [i, color] of [[255, 0, 0, 255], [0, 255, 0, 255], [255, 255, 255, 255], [255, 0, 0, 255]].entries()) {
			const expected = { pixels: Array(6).fill(color), errors: [] };
			expect(result.updates[i], JSON.stringify(result.updates[i])).toEqual({ changed: expected, stable: expected });
		}
	});
}
