import { expect, test } from '@playwright/test';
import { installTextTextureProbe } from '../TextTextureHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: placement reuses text pixels while style, bounds and density refresh them`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		await page.evaluate(installTextTextureProbe);
		const result = await page.evaluate(() => {
			const h = window.filterHarness;
			const { TextField, Sprite } = h.kurot;
			const parent = new Sprite();
			const label = new TextField();
			label.text = 'Moving text wraps onto more lines';
			label.size = 16;
			label.width = 120;
			label.height = 60;
			parent.addChild(label);
			h.root.addChild(parent);
			const sample = window.textTextureProbe.sample;
			const initial = sample();
			const changes: [string, () => void, number][] = [
				['position', () => { label.x = 12; label.y = 8; }, 0],
				['alpha', () => { label.alpha = 0.5; }, 0],
				['tint', () => { label.tint = 0x00ff00; }, 0],
				['parent position', () => { parent.x = 15; }, 0],
				['parent alpha', () => { parent.alpha = 0.5; }, 0],
				['same value', () => { label.text = label.text; }, 0],
				['color', () => { label.textColor = 0xffff00; }, 1],
				['size', () => { label.size = 20; }, 1],
				['outline', () => { label.stroke = 2; label.strokeColor = 0xff0000; }, 1],
				['wrap', () => { label.wordWrap = true; }, 1],
				['width', () => { label.width = 70; }, 1],
				['height', () => { label.height = 100; }, 1],
				['font readiness', () => { label.invalidateTextMetrics(); }, 1],
				['own resolution', () => { label.resolution = 2; }, 1],
				['inherited resolution', () => { label.resolution = undefined; }, 1],
				['stage resolution', () => { h.app.screenAdapter.resolution = 2; }, 1],
				['zero width', () => { label.width = 0; }, 0],
				['restore width', () => { label.width = 70; }, 1],
				['empty', () => { label.text = ''; }, 1],
				['restore content', () => { label.text = 'Visible again'; }, 1],
			];
			return {
				initial,
				changes: changes.map(([name, apply, expected]) => {
					apply();
					return { name, expected, changed: sample(), stable: sample() };
				}),
			};
		});
		expect(result.initial).toMatchObject({ rasters: 1, uploads: 1, draws: 1, errors: [] });
		for (const change of result.changes) {
			expect(change.changed, change.name).toMatchObject({ rasters: change.expected, uploads: change.expected, errors: [] });
			expect(change.stable, change.name).toMatchObject({ rasters: 0, uploads: 0, image: change.changed.image, errors: [] });
		}
		for (const index of [0, 1, 2, 3, 4]) {
			const previous = index ? result.changes[index - 1].changed : result.initial;
			expect(result.changes[index].changed.image).not.toBe(previous.image);
		}
	});

	test(`${backend}: failed uploads retry and context restoration rebuilds static text once`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		await page.evaluate(installTextTextureProbe);
		const result = await page.evaluate(async () => {
			const h = window.filterHarness;
			const { TextField, WebGLRenderContext } = h.kurot;
			const label = new TextField();
			label.text = 'Before';
			h.root.addChild(label);
			const sample = window.textTextureProbe.sample;
			sample();
			label.text = 'After';
			const update = WebGLRenderContext.prototype.updateTexture;
			WebGLRenderContext.prototype.updateTexture = (): void => {
				throw new Error('text upload interrupted');
			};
			let failed = false;
			try {
				sample();
			} catch (error) {
				failed = error instanceof Error && error.message === 'text upload interrupted';
			} finally {
				WebGLRenderContext.prototype.updateTexture = update;
			}
			const retried = sample();
			const stable = sample();
			const extension = h.gl.getExtension('WEBGL_lose_context')!;
			const once = (name: string): Promise<void> => new Promise(resolve => {
				h.gl.canvas.addEventListener(name, () => resolve(), { once: true });
			});
			const lost = once('webglcontextlost');
			extension.loseContext();
			await lost;
			h.errors();
			await new Promise(resolve => setTimeout(resolve, 30));
			const restored = once('webglcontextrestored');
			extension.restoreContext();
			await restored;
			return { failed, retried, stable, restored: sample(), restoredStable: sample() };
		});
		expect(result.failed).toBe(true);
		expect(result.retried).toMatchObject({ rasters: 1, uploads: 1, errors: [] });
		expect(result.stable).toMatchObject({ rasters: 0, uploads: 0, image: result.retried.image, errors: [] });
		expect(result.restored).toMatchObject({ rasters: 1, uploads: 1, image: result.retried.image, errors: [] });
		expect(result.restoredStable).toMatchObject({ rasters: 0, uploads: 0, image: result.retried.image, errors: [] });
	});
}
