import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

let bundle: string;

test.use({ headless: true, viewport: { width: 640, height: 360 } });

test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('./text-label-fixture.ts', import.meta.url))],
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
	test(`component typography and raw run ownership in ${backend}`, async ({ page }) => {
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
		await page.route('http://rich-typography.test/**', route =>
			route.fulfill({
				contentType: 'text/html',
				body: '<!doctype html><canvas width="640" height="360"></canvas>',
			}),
		);
		await page.goto(`http://rich-typography.test/?backend=${backend}`);
		await page.addScriptTag({ content: bundle });
		const result = await page.evaluate(() => {
			const { rich, bitmap, field, player, paint } = window.textLabels;
			bitmap.visible = false;
			rich.fontFamily = 'Arial';
			rich.size = 18;
			rich.textColor = 0xff0000;
			rich.stroke = 1;
			rich.strokeColor = 0;
			rich.bold = true;
			rich.italic = true;
			const flow = [
				{ text: 'Default ' },
				{ text: 'Override', style: { textColor: 0x00ff00, bold: false, italic: false, stroke: 0 } },
			];
			rich.textFlow = flow;
			const before = paint();
			let red = 0;
			let green = 0;
			for (let index = 0; index < before.length; index += 4) {
				if (before[index + 3] > 0 && before[index] > 150 && before[index + 1] < 50) {
					red++;
				}
				if (before[index + 3] > 0 && before[index + 1] > 150 && before[index] < 50) {
					green++;
				}
			}
			rich.size = 24;
			rich.width = 80;
			paint();
			const narrow = rich.height;
			rich.width = 220;
			paint();
			const wide = rich.height;
			const unchanged = JSON.stringify(rich.textFlow) === JSON.stringify(flow);
			rich.bold = false;
			rich.italic = false;
			rich.stroke = 0;
			rich.textColor = 0;
			rich.textFlow = [];
			paint();
			const empty = rich.textHeight;
			rich.textFlow = [{ text: 'Retained typography' }];
			const after = paint();
			let black = 0;
			for (let index = 0; index < after.length; index += 4) {
				if (after[index + 3] > 0 && after[index] < 30 && after[index + 1] < 30 && after[index + 2] < 30) {
					black++;
				}
			}
			return {
				webgl: player.isWebGL,
				red,
				green,
				black,
				narrow,
				wide,
				unchanged,
				empty,
				retained: [field.size, field.stroke, field.bold, field.italic, field.textColor],
				flow: rich.textFlow,
			};
		});
		expect(result.webgl).toBe(backend !== 'canvas');
		expect(result.red).toBeGreaterThan(20);
		expect(result.green).toBeGreaterThan(20);
		expect(result.black).toBeGreaterThan(20);
		expect(result.narrow).toBeGreaterThan(result.wide);
		expect(result.unchanged).toBe(true);
		expect(result.empty).toBe(0);
		expect(result.retained).toEqual([24, 0, false, false, 0]);
		expect(result.flow).toEqual([{ text: 'Retained typography' }]);
		expect(errors).toEqual([]);
		await page.screenshot({ path: `test-results/rich-label-typography-${backend}.png` });
	});
}
