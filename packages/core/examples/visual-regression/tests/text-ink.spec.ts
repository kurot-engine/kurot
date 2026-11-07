import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { browserFontNames, loadBrowserFonts } from '../../../test/fixtures/text/browser-fonts.js';
import type {} from '../TextStrokeHarness.js';

let bundle: string;
let fonts: Awaited<ReturnType<typeof loadBrowserFonts>>;

test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('../TextStrokeHarness.ts', import.meta.url))],
		bundle: true,
		write: false,
		minify: true,
		format: 'iife',
		platform: 'browser',
		target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
	fonts = await loadBrowserFonts();
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const resolution of [1, 2]) {
		test(`${backend} ${resolution}x: ink matches native drawing across fonts, sizes and italic styles`, async ({
			page,
		}) => {
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
			await page.route('http://text-ink.test/**', route => {
				const font = fonts.get(new URL(route.request().url()).pathname);
				return font
					? route.fulfill({ contentType: 'font/woff2', body: font })
					: route.fulfill({ contentType: 'text/html', body: '<!doctype html><canvas></canvas>' });
			});
			await page.goto(`http://text-ink.test/?backend=${backend}&resolution=${resolution}&height=360`);
			await page.evaluate(async names => {
				for (const name of names) {
					document.fonts.add(
						await new FontFace(`Ink-${name}`, `url(/${name}.woff2)`, { weight: '700' }).load(),
					);
				}
			}, browserFontNames);
			await page.addScriptTag({ content: bundle });
			const results = await page.evaluate(
				({ names, strokes }) => {
					const { field, compare } = window.textStroke;
					field.bold = true;
					field.verticalAlign = window.textStroke.kurot.VerticalAlign.TOP;
					const failures: string[] = [];
					const samples: Record<string, string> = {
						'noto-sans': 'Ó',
						barlow: 'Ó',
						'barlow-bold': 'Ó',
						arabic: 'مُ',
						hebrew: 'מִ',
						devanagari: 'फ़',
						bengali: 'নি',
						korean: '임',
						thai: 'กิ้',
						japanese: 'ゲ',
						simplified: '游',
						traditional: '遊',
					};
					for (const name of names) {
						field.fontFamily = `Ink-${name}`;
						for (const size of [12, 24, 48, 96]) {
							field.size = size;
							for (const stroke of strokes) {
								field.stroke = stroke;
								for (const italic of [false, true]) {
									field.italic = italic;
									for (const text of ['f', 'j', samples[name]]) {
										field.text = text;
										const metrics = field.measureText();
										const pixels = compare();
										if (
											pixels.lost ||
											pixels.extra ||
											JSON.stringify(field.measureText()) !== JSON.stringify(metrics)
										) {
											failures.push(JSON.stringify({ name, size, stroke, italic, text, pixels }));
										}
									}
								}
							}
						}
					}
					return failures;
				},
				{
					names: browserFontNames,
					// CPU/GPU subpixel-stroke antialiasing differs in WebKit. Compare
					// fractional native ink on Canvas; UI also checks fractional GPU clips.
					strokes: backend === 'canvas' ? [0, 0.5, 2, 6] : [0, 2, 6],
				},
			);
			expect(results).toEqual([]);
		});
	}
}
