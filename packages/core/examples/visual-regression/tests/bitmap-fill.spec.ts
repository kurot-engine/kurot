import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import type {} from '../BitmapFillHarness.js';

let bundle: string;
test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('../BitmapFillHarness.ts', import.meta.url))],
		bundle: true,
		write: false,
		minify: true,
		keepNames: false,
		format: 'iife',
		platform: 'browser',
		target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const resolution of [1, 2]) {
		test(`${backend} ${resolution}x: repeat/clip atlas pixels, rotated crops and cached parents`, async ({
			page,
		}) => {
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
			await page.route('http://bitmap-fill.test/**', route =>
				route.fulfill({
					contentType: 'text/html',
					body: '<!doctype html><canvas></canvas>',
				}),
			);
			await page.goto(`http://bitmap-fill.test/?backend=${backend}&resolution=${resolution}`);
			await page.addScriptTag({ content: bundle });
			const result = await page.evaluate(() => {
				const { bitmap, root, configure, compare, kurot, player } = window.bitmapFill;
				const mismatches: Record<string, number> = {};
				for (const density of [1, 2, 3]) {
					for (const trimmed of [false, true]) {
						for (const rotated of [false, true]) {
							configure(trimmed, rotated, density);
							for (const mode of ['repeat', 'clip'] as const) {
								bitmap.tint = 0xffffff;
								bitmap.fillMode = mode;
								bitmap.scale9Grid = new kurot.Rectangle(2, 1, 2, 2);
								const name = `${density}-${mode}-${trimmed}-${rotated}`;
								mismatches[name] = compare();
								root.cacheAsBitmap = true;
								mismatches[`${name}-cache`] = compare();
								bitmap.fillMode = mode === 'repeat' ? 'clip' : 'repeat';
								mismatches[`${name}-changed-cache`] = compare();
								root.cacheAsBitmap = false;
								bitmap.tint = 0x80ff40;
								mismatches[`${name}-tint`] = compare();
								root.cacheAsBitmap = true;
								mismatches[`${name}-tinted-cache`] = compare();
								root.cacheAsBitmap = false;
							}
						}
					}
				}
				configure(false, false);
				bitmap.tint = 0xffffff;
				bitmap.width = 32;
				bitmap.height = 24;
				bitmap.scale9Grid = undefined;
				bitmap.fillMode = 'scale';
				mismatches.scale = compare();
				const capture = (): Uint8ClampedArray => {
					player.render(false, 0);
					const source = document.querySelector('canvas')!;
					const copy = document.createElement('canvas');
					copy.width = source.width;
					copy.height = source.height;
					const context = copy.getContext('2d')!;
					context.drawImage(source, 0, 0);
					return context.getImageData(0, 0, copy.width, copy.height).data;
				};
				bitmap.width = 37;
				bitmap.height = 29;
				bitmap.scale9Grid = new kurot.Rectangle(3, 2, 2, 1);
				for (const trimmed of [false, true]) {
					for (const tint of [0xffffff, 0x80ff40]) {
						for (const cached of [false, true]) {
							root.cacheAsBitmap = cached;
							bitmap.tint = tint;
							configure(trimmed, false, 1);
							const reference = capture();
							for (const density of [2, 3]) {
								configure(trimmed, false, density);
								const actual = capture();
								const count = actual.reduce((sum, value, i) => sum + (value !== reference[i] ? 1 : 0), 0);
								mismatches[`nine-slice-${density}-${trimmed}-${tint}-${cached}`] = count;
							}
						}
					}
				}
				return { mismatches, webgl: player.isWebGL };
			});
			expect(result.webgl).toBe(backend !== 'canvas');
			for (const [name, count] of Object.entries(result.mismatches)) {
				expect(count, `${backend}/${resolution}: ${name}`).toBe(0);
			}
			expect(errors).toEqual([]);
		});
	}
}
