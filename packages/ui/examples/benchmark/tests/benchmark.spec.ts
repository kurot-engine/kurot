import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { UIBenchmarkResult } from '../src/types.js';

const resultsDir = fileURLToPath(new URL('../results', import.meta.url));
const smoke = process.env.UI_BENCHMARK_PROFILE === 'smoke';
const warmupFrames = smoke ? 5 : 60;
const measuredFrames = smoke ? 15 : 300;
const scenarioIds = ['static-skin', 'transform-alpha', 'virtual-list'] as const;

test('runs the UI benchmark matrix', async ({ page }) => {
	test.setTimeout(smoke ? 120_000 : 8 * 60 * 1000);
	await page.goto('/benchmark/');
	await expect(page.locator('#status')).toHaveText('Ready');

	const results: UIBenchmarkResult[] = [];
	for (const scenarioId of scenarioIds) {
		const result = await page.evaluate(
			async ({ id, warmup, frames }) => window.__UI_BENCHMARK_RUN__!(id, warmup, frames),
			{ id: scenarioId, warmup: warmupFrames, frames: measuredFrames },
		);
		results.push(result);
		expect(result.measuredFrames).toBe(measuredFrames);
		expect(result.setupTimeMs).toBeGreaterThan(0);
		expect(result.frameTimeMs.p95).toBeGreaterThan(0);
		expect(result.renderTimeMs.p95).toBeGreaterThanOrEqual(0);
		if (scenarioId === 'static-skin') {
			expect(result.drawCalls.max).toBe(1);
			expect(result.validation.commitProperties).toBe(0);
			expect(result.validation.measure).toBe(0);
			expect(result.validation.updateDisplayList).toBe(0);
		}
		if (scenarioId === 'transform-alpha') {
			expect(result.drawCalls.max).toBe(1);
			expect(result.validation.commitProperties).toBe(240 * measuredFrames);
			expect(result.validation.measure).toBe(0);
			expect(result.validation.updateDisplayList).toBe(0);
		}
		if (scenarioId === 'virtual-list') {
			expect(result.validation.rendererCreated).toBeLessThan(100);
			expect(result.validation.maxLiveRenderers).toBeLessThan(100);
			expect(result.validation.rendererReused).toBeGreaterThan(0);
		}
	}

	await mkdir(resultsDir, { recursive: true });
	await writeFile(`${resultsDir}/ui-benchmark.json`, `${JSON.stringify(results, undefined, 2)}\n`);
	const table = [
		'# Kurot UI benchmark',
		'',
		'| Scenario | Objects | Setup | Frame P95 | Render P95 | Draw calls | commit | measure | display | created | data updates | max live |',
		'| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
		...results.map(result =>
			`| ${result.scenarioName} | ${result.objectCount} | ${result.setupTimeMs.toFixed(2)} ms | ${result.frameTimeMs.p95.toFixed(2)} ms | ${result.renderTimeMs.p95.toFixed(2)} ms | ${result.drawCalls.median.toFixed(1)} | ${result.validation.commitProperties} | ${result.validation.measure} | ${result.validation.updateDisplayList} | ${result.validation.rendererCreated} | ${result.validation.rendererReused} | ${result.validation.maxLiveRenderers} |`,
		),
		'',
	];
	await writeFile(`${resultsDir}/ui-benchmark.md`, table.join('\n'));
});
