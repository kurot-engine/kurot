import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

let bundle: string;
test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('./label-outline-fixture.ts', import.meta.url))],
		bundle: true,
		write: false,
		format: 'iife',
		minify: true,
		platform: 'browser',
		target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const density of [1, 2]) {
		test(`outlined Label clips and typewriter layout in ${backend} at ${density}x`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: { width: 640, height: 360 },
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
				const font = await readFile(
					new URL('../../../../examples/game/resource/assets/fonts/ChakraPetch-Bold.ttf', import.meta.url),
				);
				await page.route('http://label-outline.test/**', route =>
					route.request().url().endsWith('.ttf')
						? route.fulfill({ contentType: 'font/ttf', body: font })
						: route.fulfill({
								contentType: 'text/html',
								body: '<!doctype html><style>body{margin:0} @font-face{font-family:OutlineFixture;src:url(/font.ttf);font-weight:700}</style><canvas width="640" height="360"></canvas>',
							}),
				);
				await page.goto(`http://label-outline.test/?backend=${backend}&density=${density}`);
				await page.evaluate(() => document.fonts.load('bold 26px OutlineFixture'));
				await page.addScriptTag({ content: bundle });
				expect(await page.evaluate(() => window.labelOutlines.webgl)).toBe(backend !== 'canvas');
				for (const vertical of ['top', 'middle', 'bottom']) {
					for (const horizontal of ['left', 'center', 'right']) {
						const result = await page.evaluate(
							({ vertical, horizontal }) =>
								window.labelOutlines.run({
									text: 'Hey, welcome!\n日本語の会話',
									stroke: 6,
									horizontal,
									vertical,
									mode: 'fixed',
									italic: true,
								}),
							{ vertical, horizontal },
						);
						expect(result.painted).toBeGreaterThan(1000);
						expect(result.different, `${vertical}/${horizontal} clipping`).toBe(0);
					}
				}
				for (const mode of ['automatic', 'height', 'maximum', 'fit', 'tail'] as const) {
					const result = await page.evaluate(
						mode =>
							window.labelOutlines.run({
								text:
									mode === 'tail'
										? '日本語の文章が最後の行までスクロールされます。'.repeat(12)
										: 'Доказуемая честность 日本語の会話',
								stroke: 2,
								horizontal: 'right',
								vertical: 'top',
								mode,
							}),
						mode,
					);
					expect(result.painted).toBeGreaterThan(1000);
					expect(result.different, `${mode} clipping`).toBe(0);
					if (mode === 'tail') expect(result.scroll).toBeGreaterThan(100);
					if (mode === 'fit') expect(result.size).toBeLessThan(26);
				}
				const typewriter = await page.evaluate(() => window.labelOutlines.typewriter());
				expect(new Set(typewriter.origins)).toEqual(new Set([6]));
				expect(typewriter.baselines.slice(0, 3)).toEqual(Array(3).fill(typewriter.baselines[0]));
				expect(Math.min(...typewriter.baselines)).toBeGreaterThanOrEqual(typewriter.baselines[0] - 0.01);
				await page.screenshot({ path: `test-results/label-outlines-${backend}-${density}x.png` });
				expect(errors).toEqual([]);
			} finally {
				await context.close();
			}
		});
	}
}
