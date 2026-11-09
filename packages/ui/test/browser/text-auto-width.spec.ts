import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

let browserBundle: string;
test.use({ headless: true, viewport: { width: 360, height: 220 } });
test.beforeAll(async () => {
	const result = await build({
		alias: { '@kurot/core': fileURLToPath(new URL('../../../core/src/index.ts', import.meta.url)) },
		entryPoints: [fileURLToPath(new URL('./text-auto-width-fixture.ts', import.meta.url))],
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
	test(`automatic text width, fitting and layout recovery in ${backend}`, async ({ page }) => {
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
		await page.route('http://text-auto-width.test/**', route => route.fulfill({
			contentType: 'text/html',
			body: '<!doctype html><style>body{margin:0;background:#151515}</style><canvas width="360" height="220"></canvas>',
		}));
		await page.goto(`http://text-auto-width.test/?backend=${backend}`);
		await page.addScriptTag({ content: browserBundle });
		expect(await page.evaluate(() => window.textAutoWidth.webgl)).toBe(backend !== 'canvas');
		const roundTrip = await page.evaluate(() => {
			const fixture = window.textAutoWidth;
			return ['Specialty', 'Hi', 'Specialty'].map(text => {
				fixture.setText(text);
				return fixture.paint();
			});
		});
		expect(roundTrip[2]).toEqual(roundTrip[0]);
		for (const frame of roundTrip) {
			expect(frame.stable).toBe(true);
			for (const sample of frame.samples) {
				expect(sample.lines).toBe(1);
				expect(sample.renderedSize).toBe(16);
				expect(sample.groupWidth).toBe(sample.width + 20);
			}
		}
		expect(roundTrip[1].samples[0].width).toBeLessThan(roundTrip[0].samples[0].width);
		expect(roundTrip[1].image).not.toBe(roundTrip[0].image);
		const fitting = await page.evaluate(() => {
			const fixture = window.textAutoWidth;
			return ['Hi', 'W'.repeat(9), 'W'.repeat(64), 'Hi'].map(text => {
				fixture.labels[2].text = text;
				const frame = fixture.paint();
				return { sample: frame.samples[2], stable: frame.stable };
			});
		});
		expect(fitting[3]).toEqual(fitting[0]);
		expect(fitting.every(frame => frame.stable && frame.sample.size === 16)).toBe(true);
		expect(fitting[1].sample.width).toBeGreaterThanOrEqual(119);
		expect(fitting[1].sample.width).toBeLessThanOrEqual(120);
		expect(fitting[1].sample.renderedSize).toBeGreaterThan(12);
		expect(fitting[1].sample.renderedSize).toBeLessThan(16);
		expect(fitting[1].sample.overflow).toBe(false);
		expect(fitting[2].sample).toMatchObject({ width: 120, renderedSize: 12, overflow: true, lines: 1 });
		const constrained = await page.evaluate(() => {
			const fixture = window.textAutoWidth;
			fixture.setText('Specialty');
			return [50, 160, 50, NaN].map(width => {
				for (const group of fixture.groups) {
					group.width = width;
				}
				return fixture.paint();
			});
		});
		expect(constrained.every(frame => frame.stable)).toBe(true);
		expect(constrained[2]).toEqual(constrained[0]);
		expect(constrained[3]).toEqual(roundTrip[0]);
		for (const index of [0, 1]) {
			expect(constrained[0].samples[index].lines).toBeGreaterThan(1);
			expect(constrained[1].samples[index].lines).toBe(1);
		}
		expect(constrained[0].samples[2]).toMatchObject({ width: 30, renderedSize: 12, overflow: true });
		expect(constrained[1].samples[2]).toMatchObject({ width: 120, renderedSize: 16, overflow: false });
		const heightLimited = await page.evaluate(() => {
			const fixture = window.textAutoWidth;
			const label = fixture.labels[2];
			label.size = 30;
			label.text = 'ABCD';
			label.top = label.bottom = 0;
			return [20, 60, 20].map(height => {
				fixture.groups[2].height = height;
				const frame = fixture.paint();
				return { sample: frame.samples[2], stable: frame.stable };
			});
		});
		expect(heightLimited[2]).toEqual(heightLimited[0]);
		expect(heightLimited.every(frame => frame.stable)).toBe(true);
		expect(heightLimited[0].sample.renderedSize).toBeLessThan(30);
		expect(heightLimited[1].sample.renderedSize).toBe(30);
		expect(heightLimited[1].sample.width).toBeGreaterThan(heightLimited[0].sample.width);
		await page.screenshot({ path: `test-results/text-auto-width-${backend}.png` });
		expect(errors).toEqual([]);
	});
}
