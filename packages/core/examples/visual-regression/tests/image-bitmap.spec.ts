import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

let bundle: string;

test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('../ImageBitmapHarness.ts', import.meta.url))],
		bundle: true,
		write: false,
		minify: true,
		format: 'iife',
		platform: 'browser',
		target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
});

for (const backend of ['webgl1', 'webgl2']) {
	test(`${backend}: ImageBitmap alpha, ownership and restored uploads`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		await page.route('http://image-bitmap.test/**', route => route.fulfill({
			contentType: 'text/html',
			body: '<!doctype html><body></body>',
		}));
		await page.goto(`http://image-bitmap.test/?backend=${backend}`);
		await page.addScriptTag({ content: bundle });
		await expect(page.locator('body')).toHaveAttribute('data-result', /./, { timeout: 30_000 });
		const result = JSON.parse(await page.locator('body').getAttribute('data-result') ?? '{}') as {
			error?: string;
			backend: string;
			webgl2: boolean;
			pixels: { name: string; createError: number; updateError: number }[];
			ownedReleased: boolean;
			borrowedRetained: boolean;
			restoration: { supported: boolean; pixelError?: number; released?: boolean };
			glError: number;
		};
		expect(result.error).toBeUndefined();
		expect(result.backend).toBe(backend);
		expect(result.webgl2).toBe(backend === 'webgl2');
		expect(result.pixels).toHaveLength(4);
		for (const pixels of result.pixels) {
			expect(pixels.createError, pixels.name).toBeLessThanOrEqual(1);
			expect(pixels.updateError, pixels.name).toBeLessThanOrEqual(1);
		}
		expect(result.ownedReleased).toBe(true);
		expect(result.borrowedRetained).toBe(true);
		expect(result.restoration.supported).toBe(true);
		expect(result.restoration.pixelError).toBeLessThanOrEqual(1);
		expect(result.restoration.released).toBe(true);
		expect(result.glError).toBe(0);
		expect(errors).toEqual([]);
	});
}
