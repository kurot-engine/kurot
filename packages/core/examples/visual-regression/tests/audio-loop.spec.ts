import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type {} from '../AudioLoopHarness.js';

let bundle: string;
test.beforeAll(async () => {
	const result = await build({
		entryPoints: [fileURLToPath(new URL('../AudioLoopHarness.ts', import.meta.url))],
		bundle: true,
		write: false,
		minify: true,
		format: 'iife',
		platform: 'browser',
		target: 'es2022',
	});
	bundle = result.outputFiles[0].text;
});

test.beforeEach(async ({ page }) => {
	await page.route('http://audio-loop.test/**', async route => {
		if (new URL(route.request().url()).pathname === '/fixture.mp3') {
			const path = process.env.KUROT_AUDIO_FIXTURE;
			if (!path) throw new Error('KUROT_AUDIO_FIXTURE is required for an external MP3 check.');
			await route.fulfill({ contentType: 'audio/mpeg', body: await readFile(path) });
		} else {
			await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Audio loops</title>' });
		}
	});
	await page.goto('http://audio-loop.test/');
	await page.addScriptTag({ content: bundle });
});

for (const sampleRate of [44100, 48000]) {
	for (const [loops, offsetFrames] of [
		[1, 0],
		[2, 0],
		[3, 75],
		[2, 257],
		[2, 300],
		[1, 257],
		[0, 75],
		[-1, 0],
		[Infinity, 0],
		[2.2, 75],
	]) {
		test(`${sampleRate}Hz loops=${loops} offset=${offsetFrames}: continuous samples and exact total plays`, async ({
			page,
		}) => {
			const result = await page.evaluate(
				async ({ loops, offsetFrames, sampleRate }) =>
					window.audioLoop.renderSyntheticLoop(loops, offsetFrames, sampleRate),
				{ loops, offsetFrames, sampleRate },
			);
			expect(result.sourceCount).toBe(1);
			expect(result.maxError).toBeLessThan(1e-5);
			expect(result.missingFrames).toBe(0);
			expect(result.trailingPeak).toBe(0);
			expect(result.completions).toBe(loops > 0 && Number.isFinite(loops) ? 1 : 0);
		});
	}
}

for (const loops of [0, 2]) {
	test(`external MP3 loops=${loops}: preserves every decoded sample at the join`, async ({ page }) => {
		test.skip(!process.env.KUROT_AUDIO_FIXTURE, 'Set KUROT_AUDIO_FIXTURE to verify an application-owned MP3.');
		const result = await page.evaluate(loops => window.audioLoop.renderMP3Loop(loops), loops);
		expect(result.sourceCount).toBe(1);
		expect(result.nativeLoop).toBe(true);
		expect(result.maxError).toBeLessThan(1e-5);
		expect(result.missingFrames).toBe(0);
		expect(result.trailingPeak).toBe(0);
		expect(result.completions).toBe(loops === 0 ? 0 : 1);
		console.log(JSON.stringify({ loops, ...result }));
	});
}
