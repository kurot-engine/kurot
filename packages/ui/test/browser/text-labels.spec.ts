import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(new URL('./text-label-fixture.ts', import.meta.url));
let browserBundle: string;

test.use({ headless: true, viewport: { width: 640, height: 360 } });

test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fixture],
		bundle: true,
		write: false,
		format: 'iife',
		minify: true,
		keepNames: false,
		platform: 'browser',
		target: 'es2022',
	});
	browserBundle = result.outputFiles[0].text;
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	test(`continuous rich text and automatic bitmap layout in ${backend}`, async ({ page }) => {
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

		await page.route('http://text-labels.test/**', route =>
			route.fulfill({
				contentType: 'text/html',
				body: '<!doctype html><style>body{margin:0;background:#151515}</style><canvas width="640" height="360"></canvas>',
			}),
		);
		await page.goto(`http://text-labels.test/?backend=${backend}`);
		await page.addScriptTag({ content: browserBundle });
		const result = await page.evaluate(() => {
			const { rich, bitmap, field, player, paint } = window.textLabels;
			const pixels = paint();
			let red = 0;
			let green = 0;
			let orange = 0;
			for (let i = 0; i < pixels.length; i += 4) {
				if (pixels[i + 3] === 0) continue;
				if (pixels[i] > 150 && pixels[i + 1] < 40 && pixels[i + 2] < 40) red++;
				if (pixels[i + 1] > 150 && pixels[i] < 40 && pixels[i + 2] < 40) green++;
				if (pixels[i] > 150 && pixels[i + 1] > 100 && pixels[i + 1] < 210 && pixels[i + 2] < 40) orange++;
			}
			const oldLines = field.getLinesArr();
			rich.textWidth;
			rich.textHeight;
			return {
				webgl: player.isWebGL,
				red,
				green,
				orange,
				richHeight: rich.height,
				lines: field.getLinesArr().map(line => line.elements.map(element => element.text).join('')),
				unchanged: field.getLinesArr() === oldLines,
				bitmap: [bitmap.width, bitmap.height],
			};
		});

		expect(result.webgl).toBe(backend !== 'canvas');
		expect(result.red).toBeGreaterThan(50);
		expect(result.green).toBeGreaterThan(50);
		expect(result.orange).toBeGreaterThan(100);
		expect(result.bitmap).toEqual([20, 24]);
		expect(result.richHeight).toBeGreaterThan(24);
		expect(result.lines.join('')).toBe('BOLD ITALICNormalabcdefghij');
		expect(result.unchanged).toBe(true);

		await page.screenshot({ path: `test-results/text-labels-${backend}.png` });
		const edited = await page.evaluate(() => {
			const { rich, bitmap, field, paint } = window.textLabels;
			rich.width = 80;
			bitmap.width = 10;
			paint();
			const narrow = { rich: rich.height, bitmap: bitmap.height };
			rich.width = 220;
			bitmap.width = 20;
			paint();
			const wide = { rich: rich.height, bitmap: bitmap.height };
			rich.width = NaN;
			bitmap.width = NaN;
			rich.textFlow = [
				{ text: '重新设置宽度之后连续换行 ABCDEFG', style: { size: 18, bold: true, textColor: 0x3399ff } },
			];
			rich.maxWidth = 80;
			bitmap.maxWidth = 40;
			paint();
			const wrapped = { width: rich.width, height: rich.height, lines: field.numLines };
			rich.multiline = false;
			paint();
			const singleHeight = rich.height;
			rich.textFlow = [];
			bitmap.text = '';
			paint();
			return {
				narrow,
				wide,
				wrapped,
				singleHeight,
				cleared: [rich.width, rich.height, bitmap.width, bitmap.height],
			};
		});

		expect(edited.narrow.rich).toBeGreaterThan(edited.wide.rich);
		expect(edited.narrow.bitmap).toBe(48);
		expect(edited.wide.bitmap).toBe(24);
		expect(edited.wrapped.width).toBeLessThanOrEqual(80);
		expect(edited.wrapped.lines).toBeGreaterThan(1);
		expect(edited.wrapped.height).toBeGreaterThan(18);
		expect(edited.singleHeight).toBe(18);
		expect(edited.cleared).toEqual([0, 0, 0, 0]);
		expect(errors).toEqual([]);
	});
}
