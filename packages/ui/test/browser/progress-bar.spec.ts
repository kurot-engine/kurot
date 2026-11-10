import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import type {} from './progress-bar-fixture.js';

for (const backend of ['canvas', 'webgl1', 'webgl2'] as const) {
	test(`animated ProgressBar stays bounded with its skin in ${backend}`, async ({ page }) => {
		const bundle = await build({
			alias: { '@kurot/core': fileURLToPath(new URL('../../../core/src/index.ts', import.meta.url)) },
			entryPoints: [fileURLToPath(new URL('./progress-bar-fixture.ts', import.meta.url))],
			bundle: true, write: false, format: 'iife', target: 'es2022',
		});
		await page.setContent('<canvas width="240" height="80"></canvas>');
		await page.addScriptTag({ content: bundle.outputFiles[0].text });
		await page.evaluate(mode => {
			window.progressAnimation = window.mountProgressAnimation(mode);
		}, backend);
		const green = [34, 204, 102, 255];
		const track = [17, 34, 51, 255];
		try {
			expect(await page.evaluate(() => window.progressAnimation.snapshot())).toMatchObject({
				value: 1600, ratio: 0.8, text: '1600 / 2000', partsBound: true, width: 200,
			});
			await page.evaluate(() => window.progressAnimation.shrink());
			const frame = await page.evaluate(() => window.progressAnimation.advance(123));
			expect(frame.value).toBeGreaterThanOrEqual(120);
			expect(frame.value).toBeLessThanOrEqual(266);
			expect(frame.ratio).toBeGreaterThanOrEqual(0);
			expect(frame.ratio).toBeLessThanOrEqual(1);
			expect(frame.text).toMatch(/^\d+ \/ 266$/);
			expect(frame).toMatchObject({ inside: green, tail: track, changes: 0, partsBound: true, width: 200 });
			expect(await page.evaluate(() => window.progressAnimation.advance(500))).toMatchObject({
				value: 120, text: '120 / 266', clip: 90, changes: 0,
			});
			await page.evaluate(() => window.progressAnimation.retarget());
			expect(await page.evaluate(() => window.progressAnimation.advance(500))).toMatchObject({
				value: 40, text: '40 / 266', clip: 30, changes: 0,
			});
			expect(await page.evaluate(() => window.progressAnimation.collapse())).toMatchObject({
				value: 0, ratio: 0, text: '0 / 0', clip: 0, inside: track, tail: track, changes: 0,
			});
		} finally {
			await page.evaluate(() => window.progressAnimation.destroy());
		}
	});
}
