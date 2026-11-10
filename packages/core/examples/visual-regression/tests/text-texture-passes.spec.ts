import { expect, test } from '@playwright/test';
import { installTextTextureProbe } from '../TextTextureHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: nested cache invalidation and Canvas snapshots preserve current text pixels`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		await page.evaluate(installTextTextureProbe);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { TextField, Sprite, RenderTexture } = h.kurot;
			const outer = new Sprite();
			const middle = new Sprite();
			const label = new TextField();
			label.text = 'Cache';
			label.width = 100;
			label.height = 45;
			label.background = true;
			label.backgroundColor = 0xff0000;
			middle.addChild(label);
			outer.addChild(middle);
			h.root.addChild(outer);
			outer.cacheAsBitmap = label.cacheAsBitmap = true;
			const sample = window.textTextureProbe.sample;
			const initial = sample();
			const snapshot = new RenderTexture();
			const updates = [0x00ff00, 0x0000ff, 0xff0000].map(color => {
				label.backgroundColor = color;
				snapshot.drawToTexture(outer);
				const canvas = snapshot.getPixel32(4, 4);
				const changed = sample();
				const gpu = h.pixel(4, 4);
				const stable = sample();
				outer.updateCacheTexture();
				const forced = sample();
				return { color, canvas, gpu, changed, stable, forced };
			});
			label.cacheAsBitmap = outer.cacheAsBitmap = false;
			const uncached = sample();
			const uncachedStable = sample();
			snapshot.dispose();
			return { initial, updates, uncached, uncachedStable };
		});
		expect(result.initial).toMatchObject({ rasters: 1, uploads: 1, errors: [] });
		for (const update of result.updates) {
			const rgba = [update.color >> 16, (update.color >> 8) & 255, update.color & 255, 255];
			expect(update.canvas).toEqual(rgba);
			expect(update.gpu).toEqual(rgba);
			expect(update.changed).toMatchObject({ rasters: 1, uploads: 1, errors: [] });
			for (const reused of [update.stable, update.forced]) {
				expect(reused).toMatchObject({ rasters: 0, uploads: 0, image: update.changed.image, errors: [] });
			}
		}
		// Toggling cacheAsBitmap retains its existing full visual invalidation.
		expect(result.uncached).toMatchObject({ rasters: 1, uploads: 1, image: result.initial.image, errors: [] });
		expect(result.uncachedStable).toMatchObject({ rasters: 0, uploads: 0, image: result.initial.image, errors: [] });
	});

	test(`${backend}: filtered text masks reuse pixels across effects and repeated cache captures`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		await page.evaluate(installTextTextureProbe);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { TextField, Sprite, BlurFilter, ColorMatrixFilter } = h.kurot;
			const owner = new Sprite();
			const target = new Sprite();
			target.graphics.beginFill(0x00ff00);
			target.graphics.drawRect(0, 0, 120, 60);
			const label = new TextField();
			label.text = 'MASK';
			label.filters = [new BlurFilter(2, 2, 2), new ColorMatrixFilter()];
			owner.addChild(target);
			owner.addChild(label);
			target.mask = label;
			owner.cacheAsBitmap = true;
			h.root.addChild(owner);
			const sample = window.textTextureProbe.sample;
			const initial = sample();
			const captures = Array.from({ length: 3 }, () => {
				owner.updateCacheTexture();
				return sample();
			});
			label.text = 'TEXT';
			const changed = sample();
			const stable = sample();
			label.text = 'MASK';
			const restored = sample();
			return { initial, captures, changed, stable, restored };
		});
		expect(result.initial).toMatchObject({ rasters: 1, uploads: 1, errors: [] });
		for (const capture of result.captures) {
			expect(capture).toMatchObject({ rasters: 0, uploads: 0, image: result.initial.image, errors: [] });
		}
		expect(result.changed).toMatchObject({ rasters: 1, uploads: 1, errors: [] });
		expect(result.changed.image).not.toBe(result.initial.image);
		expect(result.stable).toMatchObject({ rasters: 0, uploads: 0, image: result.changed.image, errors: [] });
		expect(result.restored).toMatchObject({ rasters: 1, uploads: 1, image: result.initial.image, errors: [] });
	});
}
