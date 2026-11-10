import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type {} from './multiline-fit-fixture.js';

let browserBundle: string;
let font: Buffer | undefined;
test.use({ headless: true, viewport: { width: 320, height: 160 } });
test.beforeAll(async () => {
	const result = await build({
		alias: { '@kurot/core': fileURLToPath(new URL('../../../core/src/index.ts', import.meta.url)) },
		entryPoints: [fileURLToPath(new URL('./multiline-fit-fixture.ts', import.meta.url))],
		bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022',
	});
	browserBundle = result.outputFiles[0].text;
	if (process.env.KUROT_TEXT_TEST_FONT) {
		font = await readFile(process.env.KUROT_TEXT_TEST_FONT);
	}
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const density of [1, 2]) {
		test(`word-first fitting and minimum fallback in ${backend} at ${density}x`, async ({ browser }) => {
			const context = await browser.newContext({ viewport: { width: 320, height: 160 }, deviceScaleFactor: density });
			try {
				const page = await context.newPage();
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
				await page.route('http://word-fit.test/**', route => {
					if (font && route.request().url().endsWith('/font.otf')) {
						return route.fulfill({ contentType: 'font/otf', body: font });
					}
					return route.fulfill({ contentType: 'text/html', body:
						'<!doctype html><style>body{margin:0;background:#151515}</style><canvas width="320" height="160"></canvas>' });
				});
				await page.goto(`http://word-fit.test/?backend=${backend}&density=${density}`);
				if (font) {
					await page.evaluate(async () => {
						document.fonts.add(await new FontFace('TestUI', 'url(/font.otf)').load());
					});
				}
				await page.addScriptTag({ content: browserBundle });
				for (const text of ["l'événement d'octobre", 'Доказуемая честность', 'September October', '你好世界']) {
					const result = await page.evaluate(({ text, customFont }) => {
						const { label, field, player, paint } = window.multilineFit;
						label.fontFamily = customFont ? 'TestUI' : 'Arial';
						label.size = 16;
						label.minFontSize = 12;
						label.lineSpacing = 0;
						label.text = text;
						label.textFit = 'shrink';
						const measure = document.createElement('canvas').getContext('2d');
						if (!measure) {
							throw new Error('Expected measurement context');
						}
						measure.font = `14px ${label.fontFamily}`;
						label.width = customFont && text.startsWith("l'") ? 64 :
							Math.ceil(Math.max(...text.split(' ').map(word => measure.measureText(word).width))) + 8;
						label.height = 38;
						paint();
						return {
							size: label.renderedSize, base: label.size, overflow: label.textFitOverflow,
							webgl: player.isWebGL,
							lines: field.getLinesArr().map(line => line.elements.map(element => element.text).join('')),
							emergency: field.getLinesArr().some(line => 'hasEmergencyBreak' in line && line.hasEmergencyBreak === true),
							region: [field.x, field.y, field.width, field.height],
						};
					}, { text, customFont: !!font });
					expect(result.webgl).toBe(backend !== 'canvas');
					expect(result.base).toBe(16);
					expect(result.size).toBeGreaterThanOrEqual(12);
					expect(result.size).toBeLessThanOrEqual(16);
					expect(result.overflow).toBe(false);
					expect(result.emergency).toBe(false);
					if (text.includes(' ')) {
						expect(result.lines).toEqual(text.split(' '));
					}
					if (font && text.startsWith("l'")) {
						expect(result.size).toBe(14.7);
						expect(result.region).toEqual([4, 3, 56, 32]);
					}
					const fittedPixels = await page.locator('canvas').screenshot();
					await page.evaluate(size => {
						const { label, paint } = window.multilineFit;
						label.textFit = 'none';
						label.size = size;
						paint();
					}, result.size);
					expect(await page.locator('canvas').screenshot()).toEqual(fittedPixels);
				}
				const fallback = await page.evaluate(() => {
					const { label, field, paint } = window.multilineFit;
					label.size = 16;
					label.width = 64;
					label.height = 90;
					label.textFit = 'shrink';
					label.text = 'Supercalifragilisticexpialidocious';
					paint();
					const minimum = label.renderedSize;
					const wrapped = field.numLines;
					const fits = !label.textFitOverflow;
					label.height = 16;
					paint();
					const overflow = label.textFitOverflow;
					label.height = 38;
					label.text = 'Hi';
					paint();
					const restored = label.renderedSize;
					for (let pass = 0; pass < 8; pass++) {
						paint();
					}
					return { minimum, wrapped, fits, overflow, restored, settled: label.renderedSize };
				});
				expect(fallback.minimum).toBe(12);
				expect(fallback.wrapped).toBeGreaterThan(1);
				expect(fallback.fits).toBe(true);
				expect(fallback.overflow).toBe(true);
				expect(fallback.restored).toBe(16);
				expect(fallback.settled).toBe(16);
				expect(errors).toEqual([]);
			} finally {
				await context.close();
			}
		});
	}
}
