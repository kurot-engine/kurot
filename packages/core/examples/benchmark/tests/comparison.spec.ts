import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ReportData } from '../runtime/types.js';

interface BrowserBenchmarkState {
	status: 'initializing' | 'warmup' | 'measuring' | 'complete' | 'error';
	result?: ReportData;
	error?: string;
}

interface SummaryRow {
	engine: string;
	version: string;
	backend: string;
	scene: string;
	objects: number;
	samples: number;
	fpsP5: number;
	fpsP5Min: number;
	fpsP5Max: number;
	frameP50: number;
	frameP95: number;
	frameP95Min: number;
	frameP95Max: number;
	frameP99: number;
	renderP95: number;
	renderP95Min: number;
	renderP95Max: number;
	drawCalls: number;
}

const DEFAULT_SCENES = [
	'sprite-batch',
	'mixed-texture',
	'dynamic-transform',
	'deep-container',
	'rapid-churn',
	'texture-swap',
	'filter-heavy',
];

interface BenchmarkProfile {
	scenes: string[];
	repeats: number;
	warmup: number;
	frames: number;
}

const BENCHMARK_PROFILES: Record<'smoke' | 'standard', BenchmarkProfile> = {
	smoke: {
		scenes: ['sprite-batch'],
		repeats: 1,
		warmup: 5,
		frames: 20,
	},
	standard: {
		scenes: DEFAULT_SCENES,
		repeats: 3,
		warmup: 60,
		frames: 300,
	},
};

test('runs the reproducible engine comparison matrix', async ({ browser, browserName }) => {
	const profileName = process.env.BENCHMARK_PROFILE === 'smoke' ? 'smoke' : 'standard';
	const profile = BENCHMARK_PROFILES[profileName];
	const engines = readList('BENCHMARK_ENGINES', ['kurot', 'pixi', 'egret']);
	const backends = readList('BENCHMARK_BACKENDS', ['webgl2', 'webgl1']);
	const scenes = readList('BENCHMARK_SCENES', profile.scenes);
	const repeats = readPositiveInteger('BENCHMARK_REPEATS', profile.repeats);
	const warmup = readNonNegativeInteger('BENCHMARK_WARMUP', profile.warmup);
	const frames = readPositiveInteger('BENCHMARK_FRAMES', profile.frames);
	const countOverride = process.env.BENCHMARK_COUNT;
	const seed = readNonNegativeInteger('BENCHMARK_SEED', 0x4b55524f);
	const runMode = process.env.BENCHMARK_RUN_MODE === 'headed' ? 'headed' : 'headless';
	const results: ReportData[] = [];
	const backendCount = engines.reduce((count, engine) => count + backends.filter(backend => supports(engine, backend)).length, 0);
	const totalCases = scenes.length * backendCount * repeats;
	if (totalCases === 0) {
		throw new Error('The selected engines and backends have no supported combinations.');
	}
	let caseNumber = 0;
	console.log(
		`[benchmark] Starting ${profileName} profile: ${totalCases} supported cases across ${scenes.length} scenes, ${backends.length} requested backends, ${engines.length} requested engines, and ${repeats} runs.`,
	);

	for (const scene of scenes) {
		for (const backend of backends) {
			for (const engine of engines) {
				if (!supports(engine, backend)) {
					continue;
				}
				for (let run = 1; run <= repeats; run++) {
					caseNumber++;
					console.log(`[benchmark] ${caseNumber}/${totalCases} ${scene} · ${engine} · ${backend} · run ${run}`);
					const context = await browser.newContext({ viewport: { width: 1160, height: 680 } });
					const page = await context.newPage();
					const errors: string[] = [];
					page.on('pageerror', error => errors.push(error.stack ?? error.message));
					const query = new URLSearchParams({
						engine,
						backend,
						browser: browserName,
						mode: runMode,
						scene,
						warmup: String(warmup),
						frames: String(frames),
						seed: String(seed),
						run: String(run),
					});
					if (countOverride) {
						query.set('count', countOverride);
					}
					await page.goto(`http://127.0.0.1:4173/benchmark/?${query.toString()}`);
					await page.waitForFunction(() => {
						const current = (window as Window & { __KUROT_BENCHMARK__?: BrowserBenchmarkState }).__KUROT_BENCHMARK__;
						return current?.status === 'complete' || current?.status === 'error';
					}, undefined, { timeout: Math.max(120000, (warmup + frames) * 100) });
					const current = await page.evaluate(() =>
						(window as Window & { __KUROT_BENCHMARK__?: BrowserBenchmarkState }).__KUROT_BENCHMARK__,
					);
					if (!current) {
						throw new Error('The benchmark page did not expose its result state.');
					}
					expect(current.error ?? errors.join('\n')).toBe('');
					expect(current.result).toBeDefined();
					results.push(current.result!);
					await context.close();
				}
			}
		}
	}

	const outputRoot = resolve(process.cwd(), 'examples/benchmark/results');
	const rawRoot = resolve(outputRoot, 'raw');
	await mkdir(rawRoot, { recursive: true });
	for (const result of results) {
		const env = result.environment;
		const filename = `${slug(env.engine)}-${slug(env.backend)}-${slug(result.scene)}-run-${env.run}.json`;
		await writeFile(resolve(rawRoot, filename), JSON.stringify(result, null, 2) + '\n', 'utf8');
	}
	await writeFile(resolve(outputRoot, 'comparison.json'), JSON.stringify(summarize(results), null, 2) + '\n', 'utf8');
	await writeFile(resolve(outputRoot, 'comparison.md'), formatMarkdown(results), 'utf8');
	console.log(`[benchmark] Complete. Reports written to ${outputRoot}`);
});

function summarize(results: ReportData[]): SummaryRow[] {
	const groups = new Map<string, ReportData[]>();
	for (const result of results) {
		const key = [result.environment.engine, result.environment.backend, result.scene, result.objectCount].join('|');
		const group = groups.get(key) ?? [];
		group.push(result);
		groups.set(key, group);
	}
	return [...groups.values()].map(group => {
		const first = group[0];
		const fpsP5 = group.map(item => item.fps.p5);
		const frameP95 = group.map(item => item.frameTimeMs.p95);
		const renderP95 = group.map(item => item.renderTimeMs.p95);
		return {
			engine: first.environment.engine,
			version: first.environment.engineVersion,
			backend: first.environment.backend,
			scene: first.scene,
			objects: first.objectCount,
			samples: group.length,
			fpsP5: median(fpsP5),
			fpsP5Min: Math.min(...fpsP5),
			fpsP5Max: Math.max(...fpsP5),
			frameP50: median(group.map(item => item.frameTimeMs.p50)),
			frameP95: median(frameP95),
			frameP95Min: Math.min(...frameP95),
			frameP95Max: Math.max(...frameP95),
			frameP99: median(group.map(item => item.frameTimeMs.p99)),
			renderP95: median(renderP95),
			renderP95Min: Math.min(...renderP95),
			renderP95Max: Math.max(...renderP95),
			drawCalls: median(group.map(item => item.drawCallsAvg)),
		};
	});
}

function formatMarkdown(results: ReportData[]): string {
	const rows = summarize(results);
	const lines = [
		'# 2D engine benchmark comparison',
		'',
		'Values are medians across repeated runs. Raw reports are stored in `raw/`.',
		'',
		'Ranges show minimum–maximum values across runs.',
		'',
		'| Engine | Backend | Scene | Objects | Runs | FPS p5 median [range] | Frame p50 | Frame p95 median [range] | Frame p99 | Render p95 median [range] | Draw calls |',
		'|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
	];
	for (const row of rows) {
		lines.push(
			`| ${row.engine} ${row.version} | ${row.backend} | ${row.scene} | ${row.objects} | ${row.samples} | ${formatRange(row.fpsP5, row.fpsP5Min, row.fpsP5Max, 1)} | ${row.frameP50.toFixed(2)} | ${formatRange(row.frameP95, row.frameP95Min, row.frameP95Max, 2)} | ${row.frameP99.toFixed(2)} | ${formatRange(row.renderP95, row.renderP95Min, row.renderP95Max, 2)} | ${row.drawCalls.toFixed(1)} |`,
		);
	}
	lines.push('', 'No overall winner is calculated; interpret results per workload.', '');
	return lines.join('\n');
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function formatRange(value: number, min: number, max: number, digits: number): string {
	return `${value.toFixed(digits)} [${min.toFixed(digits)}–${max.toFixed(digits)}]`;
}

function readList(name: string, fallback: string[]): string[] {
	const value = process.env[name];
	return value ? value.split(',').map(item => item.trim()).filter(Boolean) : fallback;
}

function readPositiveInteger(name: string, fallback: number): number {
	const value = Number.parseInt(process.env[name] ?? '', 10);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readNonNegativeInteger(name: string, fallback: number): number {
	const value = Number.parseInt(process.env[name] ?? '', 10);
	return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function slug(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function supports(engine: string, backend: string): boolean {
	return engine !== 'egret' || backend === 'webgl1';
}
