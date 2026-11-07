import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type {} from './backdrop-fixture.js';

let bundle: string;
let expectedCoreVersion: string;
test.beforeAll(async () => {
	const core = JSON.parse(
		await readFile(new URL('../../node_modules/@kurot/core/package.json', import.meta.url), 'utf8'),
	) as { version: string };
	expectedCoreVersion = core.version;
	const result = await build({
		entryPoints: [fileURLToPath(new URL('./backdrop-fixture.ts', import.meta.url))],
		bundle: true,
		write: false,
		format: 'iife',
		platform: 'browser',
		target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const density of [1, 2, 3]) {
		test.describe(`${backend} ${density}x`, () => {
			test.use({ deviceScaleFactor: density });
			test('UI backdrop layout, pixels, input and lifecycle', async ({ page }) => {
				const errors: string[] = [];
				page.on('pageerror', error => errors.push(error.message));
				if (backend === 'webgl1') {
					await page.addInitScript(() => {
						const original = HTMLCanvasElement.prototype.getContext;
						HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
							if (type === 'webgl2') {
								return null;
							}
							return original.call(this, type, ...args);
						} as typeof original;
					});
				}
				await page.route('http://ui-backdrop.test/**', route =>
					route.fulfill({
						contentType: 'text/html',
						body: '<!doctype html><style>body{margin:0}</style><canvas></canvas>',
					}),
				);
				await page.goto(`http://ui-backdrop.test/?backend=${backend}&density=${density}`);
				expect(await page.evaluate(() => devicePixelRatio)).toBe(density);
				await page.addScriptTag({ content: bundle });
				const result = await page.evaluate(() => window.runUIBackdropChecks());
				expect(result.backend).toBe(backend);
				expect(result.version).toBe(expectedCoreVersion);
				expect(result.failures).toEqual([]);
				expect(result.checks).toBeGreaterThan(40);
				expect(errors).toEqual([]);
			});
		});
	}
}
