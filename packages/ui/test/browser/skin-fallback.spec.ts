import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	test(`sparse Skin stays mounted and painted during native mouse presses in ${backend}`, async ({ page }) => {
		const bundle = await build({
			alias: { '@kurot/core': fileURLToPath(new URL('../../../core/src/index.ts', import.meta.url)) },
			entryPoints: [fileURLToPath(new URL('./skin-fallback-fixture.ts', import.meta.url))],
			bundle: true, write: false, format: 'iife', target: 'es2022',
		});
		await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="100" height="100"></canvas>');
		await page.addScriptTag({ content: bundle.outputFiles[0].text });
		await page.evaluate(mode => { window.sparseSkin = window.mountSparseSkin(mode); }, backend);
		const visible = { icon: [234, 52, 86, 255], quantity: [255, 255, 255, 255], mounted: true, sameHit: true, changes: 0, applied: 'up' };
		try {
			expect(await page.evaluate(() => window.sparseSkin.snapshot())).toMatchObject({ ...visible, selected: false, coreTaps: 0, itemTaps: 0 });
			await page.mouse.move(35, 35);
			for (const clicks of [1, 2, 3]) {
				await page.mouse.down();
				expect(await page.evaluate(() => window.sparseSkin.snapshot())).toMatchObject({ ...visible, requested: 'down', coreTaps: clicks - 1, itemTaps: clicks - 1 });
				await page.mouse.up();
				expect(await page.evaluate(() => window.sparseSkin.snapshot())).toMatchObject({ ...visible, selected: true, coreTaps: clicks, itemTaps: clicks });
			}
		} finally {
			await page.evaluate(() => window.sparseSkin.destroy());
		}
	});
}
