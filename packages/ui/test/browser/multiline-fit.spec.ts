import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

let browserBundle: string;
test.use({ headless: true, viewport: { width: 320, height: 160 } });
test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('./multiline-fit-fixture.ts', import.meta.url))],
		bundle: true,
		write: false,
		format: 'iife',
		minify: true,
		platform: 'browser',
		target: 'es2022',
	});
	browserBundle = result.outputFiles[0].text;
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const density of [1, 2]) {
		test(`multiline shrinking, outlines and resize recovery in ${backend} at ${density}x`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width: 320, height: 160 },
				deviceScaleFactor: density,
			});
			try {
				const page = await context.newPage();
				const errors: string[] = [];
				page.on('pageerror', error => errors.push(error.message));
				if (backend === 'webgl1') {
					await page.addInitScript(() => {
						const original = HTMLCanvasElement.prototype.getContext;
						HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
							if (type === 'webgl2') return null;
							return original.call(this, type, ...args);
						} as typeof original;
					});
				}
				await page.route('http://multiline-fit.test/**', route =>
					route.fulfill({
						contentType: 'text/html',
						body: '<!doctype html><style>body{margin:0;background:#151515}</style><canvas width="320" height="160"></canvas>',
					}),
				);
				await page.goto(`http://multiline-fit.test/?backend=${backend}`);
				await page.addScriptTag({ content: browserBundle });
				const result = await page.evaluate(() => {
					const { label, field, player, paint } = window.multilineFit;
					paint();
					const rows = field.getLinesArr();
					const context = document.createElement('canvas').getContext('2d');
					if (!context) throw new Error('Missing independent measurement context.');
					context.font = `${label.renderedSize}px ${label.fontFamily}`;
					const widths = rows.map(
						row => context.measureText(row.elements.map(element => element.text).join('')).width,
					);
					return {
						webgl: player.isWebGL,
						size: label.renderedSize,
						base: label.size,
						rows: rows.length,
						widths,
						height: field.measureText(field.width).height,
						region: [field.x, field.y, field.width, field.height],
						overflow: label.textFitOverflow,
					};
				});
				expect(result.webgl).toBe(backend !== 'canvas');
				expect(result.base).toBe(30);
				expect(result.size).toBeGreaterThanOrEqual(14);
				expect(result.size).toBeLessThan(30);
				expect(result.rows).toBe(2);
				expect(Math.max(...result.widths)).toBeLessThanOrEqual(118);
				expect(result.height).toBeLessThanOrEqual(42);
				expect(result.region).toEqual([0, 0, 118, 44]);
				expect(result.overflow).toBe(false);
				await page.screenshot({ path: `test-results/multiline-fit-${backend}-${density}x.png` });
				const resized = await page.evaluate(() => {
					const { label, field, paint } = window.multilineFit;
					label.height = 120;
					label.width = 240;
					paint();
					const restored = label.renderedSize;
					label.height = 44;
					label.width = 120;
					paint();
					const shrunk = label.renderedSize;
					label.text = '自动提现设置';
					paint();
					return {
						restored,
						shrunk,
						text: label.text,
						overflow: label.textFitOverflow,
						width: field.measureText(field.width).width,
						height: field.measureText(field.width).height,
					};
				});
				expect(resized.restored).toBe(30);
				expect(resized.shrunk).toBe(result.size);
				expect(resized.text).toBe('自动提现设置');
				expect(resized.overflow).toBe(false);
				expect(resized.width).toBeLessThanOrEqual(118);
				expect(resized.height).toBeLessThanOrEqual(42);
				await page.evaluate(() => window.multilineFit.paintAlignmentGrid(false));
				const originalAlignment = await page.locator('canvas').screenshot();
				await page.evaluate(() => window.multilineFit.paintAlignmentGrid(true));
				expect(await page.locator('canvas').screenshot()).toEqual(originalAlignment);
				await page.screenshot({ path: `test-results/fit-alignment-${backend}-${density}x.png` });
				await page.evaluate(() => window.multilineFit.paintAlignmentGrid(false));
				expect(await page.locator('canvas').screenshot()).toEqual(originalAlignment);
				expect(errors).toEqual([]);
			} finally {
				await context.close();
			}
		});
	}
}
