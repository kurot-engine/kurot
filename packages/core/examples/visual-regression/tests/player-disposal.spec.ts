import { expect, test } from '@playwright/test';
import type {} from '../FilterHarness.js';

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: destroyed players do not restore buffers when their canvas is reused`, async ({ page }) => {
		await page.goto(`http://127.0.0.1:4174/visual-regression/filter-tests.html?backend=${backend}`);
		const counts = await page.evaluate(() => {
			const { app, gl, kurot } = window.filterHarness;
			const canvas = document.querySelector<HTMLCanvasElement>('#filters')!;
			app.destroy();
			const next = kurot.createPlayer({ canvas });
			let created = 0;
			const createBuffer = gl.createBuffer.bind(gl);
			gl.createBuffer = () => {
				created++;
				return createBuffer();
			};
			canvas.dispatchEvent(new Event('webglcontextrestored'));
			const live = created;
			next.destroy();
			created = 0;
			canvas.dispatchEvent(new Event('webglcontextrestored'));
			return { live, destroyed: created };
		});
		expect(counts).toEqual({ live: 2, destroyed: 0 });
	});
}
