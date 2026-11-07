import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import {
	browserFontNames,
	loadBrowserFonts,
	textFixtureFamily,
} from '../../../core/test/fixtures/text/browser-fonts.js';
import { textLanguages } from '../../../core/test/fixtures/text/languages.js';
import type {} from './text-components-fixture.js';

let bundle: string;
let fonts: Awaited<ReturnType<typeof loadBrowserFonts>>;

test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('./text-components-fixture.ts', import.meta.url))],
		alias: { '@kurot/core': fileURLToPath(new URL('../../../core/src/index.ts', import.meta.url)) },
		bundle: true,
		write: false,
		minify: true,
		format: 'iife',
		target: 'es2022',
		platform: 'browser',
	});
	bundle = result.outputFiles[0].text;
	fonts = await loadBrowserFonts();
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const density of [1, 2]) {
		test(`${backend} ${density}x: Label and RichLabel multilingual pixels and incremental output`, async ({
			page,
		}) => {
			test.setTimeout(90000);
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
			await page.route('http://text-components.test/**', route => {
				const font = fonts.get(new URL(route.request().url()).pathname);
				return font
					? route.fulfill({ contentType: 'font/woff2', body: font })
					: route.fulfill({ contentType: 'text/html', body: '<!doctype html><canvas></canvas>' });
			});
			await page.goto(`http://text-components.test/?backend=${backend}&density=${density}`);
			await page.evaluate(async names => {
				for (const name of names) {
					const font = await new FontFace(`Fixture-${name}`, `url(/${name}.woff2)`).load();
					document.fonts.add(font);
				}
			}, browserFontNames);
			await page.addScriptTag({ content: bundle });
			expect(errors).toEqual([]);
			await page.waitForFunction(() => window.textComponents !== undefined);
			expect(await page.evaluate(() => window.textComponents.webgl)).toBe(backend !== 'canvas');
			let comparisons = 0;
			let prefixes = 0;
			for (const language of textLanguages) {
				const result = await page.evaluate(({ code, family }) => window.textComponents.run(code, family), {
					code: language.code,
					family: textFixtureFamily(language.script),
				});
				comparisons += result.comparisons;
				prefixes += result.prefixes;
			}
			expect(comparisons).toBe(31 * 12);
			expect(prefixes).toBeGreaterThan(1000);
			expect(errors).toEqual([]);
		});
	}
}
