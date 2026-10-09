import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

let bundle: string;
const red = [255, 0, 0, 255];
const green = [0, 255, 0, 255];
const blue = [0, 0, 255, 255];
const yellow = [255, 255, 0, 255];

test.use({ headless: true, viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('./centered-flip-fixture.ts', import.meta.url))],
		bundle: true,
		write: false,
		format: 'iife',
		minify: true,
		platform: 'browser',
		target: 'es2022',
	});
	bundle = result.outputFiles[0]!.text;
});

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	test(`centered flips, layout, clips, caches and render groups in ${backend}`, async ({ page }) => {
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
		await page.route('http://centered-flips.test/**', route =>
			route.fulfill({
				contentType: 'text/html',
				body: '<!doctype html><style>body{margin:0}</style><canvas width="640" height="360"></canvas>',
			}),
		);
		await page.goto(`http://centered-flips.test/?backend=${backend}`);
		await page.addScriptTag({ content: bundle });
		const combinations = [
			{ x: false, y: false, colors: [red, green, blue, yellow] },
			{ x: true, y: false, colors: [green, red, yellow, blue] },
			{ x: true, y: true, colors: [yellow, blue, green, red] },
			{ x: false, y: true, colors: [blue, yellow, red, green] },
		];
		for (const combination of combinations) {
			const result = await page.evaluate(({ x, y }) => window.centeredFlips.paint(x, y), combination);
			for (const [index, colors] of result.colors.slice(0, 5).entries()) {
				expect(colors, `${backend} case ${index}, flip ${combination.x}/${combination.y}`).toEqual(
					combination.colors,
				);
			}
			expect(result.colors[5]).toEqual([red]);
			expect(result.frames).toEqual(Array.from({ length: 5 }, () => [0, 0, 80, 40]));
			expect(result.hits).toEqual([true, true, true, true, true]);
		}
		await page.evaluate(() => window.centeredFlips.paint(true, true));
		const resized = await page.evaluate(() => window.centeredFlips.resize());
		for (const colors of resized) {
			expect(colors).toEqual([yellow, blue, green, red]);
		}
		expect(await page.evaluate(() => window.centeredFlips.moveChild())).toEqual(green);
		expect(errors).toEqual([]);
		await page.screenshot({ path: `test-results/centered-flips-${backend}.png` });
	});
}
