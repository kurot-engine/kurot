import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: static text reuses its raster and texture between content changes`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const samples = await page.evaluate(() => {
			const h = window.filterHarness;
			const { TextField, CanvasRenderer } = h.kurot;
			const label = new TextField();
			label.text = 'Static text';
			h.root.addChild(label);
			let rasters = 0;
			let uploads = 0;
			const raster = CanvasRenderer.prototype.renderTextFieldToContext;
			CanvasRenderer.prototype.renderTextFieldToContext = function (...args) {
				rasters++;
				return raster.apply(this, args);
			};
			const upload = h.gl.texImage2D;
			h.gl.texImage2D = new Proxy(upload, {
				apply(target, receiver, args) {
					if (args.length === 6 && args[5] instanceof HTMLCanvasElement) {
						uploads++;
					}
					return Reflect.apply(target, receiver, args);
				},
			});
			try {
				return Array.from({ length: 5 }, (_, frame) => {
					if (frame === 3) {
						label.text = 'Changed text';
					}
					rasters = uploads = 0;
					const draws = h.render();
					return { rasters, uploads, draws, errors: h.errors() };
				});
			} finally {
				CanvasRenderer.prototype.renderTextFieldToContext = raster;
				h.gl.texImage2D = upload;
			}
		});
		expect(samples).toEqual([1, 0, 0, 1, 0].map(count => ({ rasters: count, uploads: count, draws: 1, errors: [] })));
	});
}
