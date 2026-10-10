import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import type {} from '../TextStrokeHarness.js';

let bundle: string;
test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('../TextStrokeHarness.ts', import.meta.url))],
		bundle: true, write: false, minify: true, keepNames: false,
		format: 'iife', platform: 'browser', target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	for (const resolution of [1, 2]) {
		test(`${backend} ${resolution}x: complete strokes, stable layout and strict viewports`, async ({ page }) => {
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
			await page.route('http://text-stroke.test/**', route => route.fulfill({
				contentType: 'text/html',
				body: '<!doctype html><style>body{margin:0;background:#333}</style><canvas width="320" height="180"></canvas>',
			}));
			await page.goto(`http://text-stroke.test/?backend=${backend}&resolution=${resolution}`);
			await page.addScriptTag({ content: bundle });
			const result = await page.evaluate(({ backend, resolution }) => {
				const { field, player, root, compare, kurot } = window.textStroke;
				const lines = field.getLinesArr();
				const size = [field.width, field.height, field.textWidth, field.textHeight];
				const plain = compare();
				const stable = field.getLinesArr() === lines && size.every((value, index) =>
					value === [field.width, field.height, field.textWidth, field.textHeight][index]);
				field.cacheAsTexture(true);
				const cached = compare();
				field.cacheAsTexture(false);
				root.cacheAsTexture(true);
				const cachedParent = compare();
				root.cacheAsTexture(false);
				// Canvas CPU filters and object masks rasterize at 1x before compositing.
				const checkCapture = backend !== 'canvas' || resolution === 1;
				root.filters = checkCapture ? [new kurot.ColorMatrixFilter()] : [];
				const filtered = checkCapture ? compare() : undefined;
				root.filters = [];
				field.width = 140;
				field.height = 40;
				field.textAlign = kurot.HorizontalAlign.RIGHT;
				field.verticalAlign = kurot.VerticalAlign.BOTTOM;
				const aligned = compare();
				field.textAlign = kurot.HorizontalAlign.CENTER;
				field.verticalAlign = kurot.VerticalAlign.MIDDLE;
				field.textFlow = [{ text: 'How ', style: { stroke: 0 } }, { text: 'to play', style: { stroke: 5 } }];
				const rich = compare();
				field.stroke = 0;
				field.text = 'How to play';
				const clearedStroke = compare();
				field.stroke = 2;
				field.width = NaN;
				field.height = NaN;
				field.textAlign = kurot.HorizontalAlign.LEFT;
				field.verticalAlign = kurot.VerticalAlign.TOP;
				field.width = Math.ceil(field.width);
				const shapeMask = new kurot.Shape();
				shapeMask.graphics.beginFill(0xffffff);
				shapeMask.graphics.drawRect(field.x - 15, field.y - 15, field.width + 30, field.height + 30);
				root.addChild(shapeMask);
				field.mask = shapeMask;
				const objectMasked = checkCapture ? compare() : undefined;
				field.mask = undefined;
				root.removeChild(shapeMask);
				field.scrollRect = new kurot.Rectangle(0, 0, field.width, field.height);
				const masked = compare(true);
				field.scrollRect = undefined;
				field.type = kurot.TextFieldType.INPUT;
				const input = compare(true);
				return { webgl: player.isWebGL, stable, plain, cached, cachedParent, filtered, aligned, rich, clearedStroke, objectMasked, masked, input };
			}, { backend, resolution });
			expect(result.webgl).toBe(backend !== 'canvas');
			expect(result.stable).toBe(true);
			for (const pixels of [result.plain, result.cached, result.cachedParent, result.filtered,
				result.aligned, result.rich, result.clearedStroke, result.objectMasked, result.masked, result.input]) {
				if (!pixels) continue;
				expect(pixels.lost, JSON.stringify(result)).toBe(0);
				expect(pixels.extra, JSON.stringify(result)).toBe(0);
			}
			expect(result.plain.inkOutsideLayout).toBeGreaterThan(0);
			expect(result.masked.inkOutsideLayout).toBe(0);
			expect(result.input.inkOutsideLayout).toBe(0);

			const scroll = await page.evaluate(() => {
				const { field, paint, kurot } = window.textStroke;
				field.type = kurot.TextFieldType.DYNAMIC;
				field.height = 20;
				field.stroke = 4;
				field.textFlow = [
					{ text: 'A\n', style: { textColor: 0xff0000, strokeColor: 0xff0000 } },
					{ text: 'B\n', style: { textColor: 0x00ff00, strokeColor: 0x00ff00 } },
					// Matching glyph extents put the last row entirely outside this viewport.
					{ text: 'A', style: { textColor: 0x0000ff, strokeColor: 0x0000ff } },
				];
				field.scrollV = 2;
				const pixels = paint();
				let hidden = 0;
				let visible = 0;
				for (let i = 0; i < pixels.length; i += 4) {
					if (pixels[i + 3] < 20) continue;
					if (pixels[i] > 50 || pixels[i + 2] > 50) hidden++;
					if (pixels[i + 1] > 50) visible++;
				}
				return { hidden, visible, multiline: field.multiline, scroll: field.getScrollYOffset(),
					lines: field.getLinesArr().map(line => ({ height: line.height, baseline: line.baseline,
						ascent: line.inkAscent, descent: line.inkDescent })) };
			});
			expect(scroll.hidden, JSON.stringify(scroll)).toBe(0);
			expect(scroll.visible).toBeGreaterThan(100);
			expect(errors).toEqual([]);
		});
	}
}
