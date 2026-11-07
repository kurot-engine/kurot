import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import type {} from '../TextScrollHarness.js';

let bundle: string;
test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('../TextScrollHarness.ts', import.meta.url))],
		bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const resolution of [1, 2]) {
		test(`mixed-height scroll draws the terminal row in ${backend} ${resolution}x`, async ({ page }) => {
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
			await page.route('http://text-scroll.test/**', route => route.fulfill({
				contentType: 'text/html', body: '<!doctype html><canvas></canvas>',
			}));
			await page.goto(`http://text-scroll.test/?backend=${backend}&resolution=${resolution}`);
			await page.addScriptTag({ content: bundle });
			const result = await page.evaluate(() => window.runTextScrollChecks());
			expect(result.backend).toBe(backend);
			expect(result.cases).toBe(3);
			expect(result.failures).toEqual([]);
			expect(errors).toEqual([]);
		});
	}
}
