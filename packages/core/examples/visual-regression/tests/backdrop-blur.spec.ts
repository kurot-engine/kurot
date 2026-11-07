import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import type {} from '../BackdropHarness.js';

let bundle: string;
test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('../BackdropHarness.ts', import.meta.url))],
		bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
});

for (const mode of ['canvas', 'webgl1', 'webgl2', 'webgl2-single-sample'] as const) {
	const backend = mode === 'webgl2-single-sample' ? 'webgl2' : mode;
	for (const resolution of [1, 2, 3]) {
		test.describe(`${mode} ${resolution}x`, () => {
			test.use({ deviceScaleFactor: resolution });
			test('live backdrop pixels and lifecycle', async ({ page }) => {
				const errors: string[] = [];
				page.on('pageerror', error => errors.push(error.message));
				if (backend === 'webgl1') {
					await page.addInitScript(() => {
						const original = HTMLCanvasElement.prototype.getContext;
						HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
							return type === 'webgl2' ? null : original.call(this, type, ...args);
						} as typeof original;
					});
				}
				await page.route('http://backdrop.test/**', route => route.fulfill({
					contentType: 'text/html',
					body: '<!doctype html><style>html,body{margin:0;width:160px;height:120px}canvas{width:160px;height:120px}</style><canvas></canvas>',
				}));
				await page.goto(`http://backdrop.test/?backend=${backend}&resolution=${resolution}&antialias=${mode !== 'webgl2-single-sample'}`);
				expect(await page.evaluate(() => devicePixelRatio)).toBe(resolution);
				await page.addScriptTag({ content: bundle });
				const report = await page.evaluate(() => window.runBackdropChecks());
				expect(report.backend).toBe(backend);
				expect(report.failures).toEqual([]);
				expect(report.checks).toBeGreaterThanOrEqual(17);
				expect(errors).toEqual([]);
			});
		});
	}
}
