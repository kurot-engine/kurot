import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import type {} from '../TextureAlphaHarness.js';

let bundle: string;
test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('../TextureAlphaHarness.ts', import.meta.url))],
		bundle: true,
		write: false,
		format: 'iife',
		platform: 'browser',
		target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const resolution of [1, 2, 3]) {
		test(`${backend} ${resolution}x: raw texture alpha, shared sampler and readback recovery`, async ({ page }) => {
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
			await page.route('http://texture-alpha.test/**', route => route.fulfill({
				contentType: 'text/html',
				body: '<!doctype html><style>html,body{margin:0;width:64px;height:64px}</style><canvas></canvas>',
			}));
			await page.route('http://cross-origin-alpha.test/pixel.png', route => route.fulfill({
				contentType: 'image/png',
				body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'),
			}));
			await page.goto(`http://texture-alpha.test/?backend=${backend}&resolution=${resolution}`);
			await page.addScriptTag({ content: bundle });
			const report = await page.evaluate(() => window.runTextureAlphaChecks('http://cross-origin-alpha.test/pixel.png'));
			expect(report.webgl).toBe(backend !== 'canvas');
			expect(report.backingSize).toEqual([64 * resolution, 64 * resolution]);
			expect(report.checks).toBeGreaterThan(2300);
			expect(report.failures).toEqual([]);
			expect(errors).toEqual([]);
		});
	}
}
