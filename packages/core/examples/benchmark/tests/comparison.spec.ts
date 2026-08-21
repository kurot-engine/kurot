import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { arch, cpus, hostname, platform, totalmem } from 'node:os';
import { resolve } from 'node:path';
import type { ReportData } from '../runtime/types.js';
import { evaluateRegressionGate, type BenchmarkBaseline } from './performance-gate.js';

interface BrowserBenchmarkState {
	status: 'initializing' | 'warmup' | 'measuring' | 'complete' | 'error';
	result?: ReportData;
	error?: string;
}

export interface SummaryRow {
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
	heapP95?: number;
	textureCount: number;
	framebufferPoolSize?: number;
}

interface RunMetadata {
	schemaVersion: 1;
	machine: {
		id: string;
		named: boolean;
		platform: string;
		arch: string;
		cpu: string;
		cpuCount: number;
		totalMemoryBytes: number;
	};
	source: { commit: string; dirty: boolean };
	browser: { name: string; version: string };
	profile: string;
	startedAt: string;
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
		repeats: 5,
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
	const startedAt = new Date().toISOString();
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
	const metadata = createRunMetadata(browserName, browser.version(), profileName, startedAt);
	const summary = summarize(results);
	const rawRoot = resolve(outputRoot, 'raw');
	await mkdir(rawRoot, { recursive: true });
	for (const result of results) {
		const env = result.environment;
		const filename = `${slug(env.engine)}-${slug(env.backend)}-${slug(result.scene)}-run-${env.run}.json`;
		await writeFile(resolve(rawRoot, filename), JSON.stringify(result, null, 2) + '\n', 'utf8');
	}
	await writeFile(resolve(outputRoot, 'comparison.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
	await writeFile(resolve(outputRoot, 'comparison.md'), formatMarkdown(results), 'utf8');
	await writeFile(resolve(outputRoot, 'run-metadata.json'), JSON.stringify(metadata, null, 2) + '\n', 'utf8');
	const historyRoot = resolve(outputRoot, 'history', slug(metadata.machine.id), metadata.source.commit, startedAt.replace(/[:.]/g, '-'));
	await mkdir(historyRoot, { recursive: true });
	await writeFile(resolve(historyRoot, 'run.json'), JSON.stringify({ metadata, summary, results }, null, 2) + '\n', 'utf8');
	await writeFile(resolve(outputRoot, 'baseline-candidate.json'), JSON.stringify({ metadata, rows: summary }, null, 2) + '\n', 'utf8');
	await applyRegressionGate(metadata, summary);
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
			heapP95: medianOptional(group.map(item => item.resources.heapUsedBytes?.p95)),
			textureCount: Math.max(...group.map(item => item.resources.textureCount.max)),
			framebufferPoolSize: maxOptional(group.map(item => item.resources.framebufferPoolSize?.max)),
		};
	});
}

async function applyRegressionGate(metadata: RunMetadata, rows: SummaryRow[]): Promise<void> {
	if (!metadata.machine.named) {
		console.log('[benchmark] Regression gate skipped: set BENCHMARK_MACHINE to identify a reference machine.');
		return;
	}
	const baselinePath = resolve(process.cwd(), 'examples/benchmark/baselines', `${slug(metadata.machine.id)}.json`);
	let baseline: BenchmarkBaseline;
	try {
		baseline = JSON.parse(await readFile(baselinePath, 'utf8')) as BenchmarkBaseline;
	} catch {
		console.log(`[benchmark] Regression gate skipped: no approved baseline at ${baselinePath}.`);
		return;
	}
	const gate = evaluateRegressionGate(baseline, { metadata, rows });
	await writeFile(resolve(process.cwd(), 'examples/benchmark/results/regression-gate.json'), JSON.stringify(gate, null, 2) + '\n', 'utf8');
	if (gate.status === 'incompatible') throw new Error(`Benchmark baseline is incompatible: ${gate.reason}`);
	expect(gate.regressions, gate.regressions.map(item => item.message).join('\n')).toEqual([]);
	console.log('[benchmark] Regression gate passed.');
}

function createRunMetadata(browserName: string, browserVersion: string, profile: string, startedAt: string): RunMetadata {
	const machineName = process.env.BENCHMARK_MACHINE?.trim();
	return {
		schemaVersion: 1,
		machine: {
			id: machineName || `unnamed-${hostname()}`,
			named: !!machineName,
			platform: platform(),
			arch: arch(),
			cpu: cpus()[0]?.model ?? 'unknown',
			cpuCount: cpus().length,
			totalMemoryBytes: totalmem(),
		},
		source: { commit: readGit(['rev-parse', 'HEAD'], 'unknown'), dirty: readGit(['status', '--porcelain'], '') !== '' },
		browser: { name: browserName, version: browserVersion },
		profile,
		startedAt,
	};
}

function readGit(args: string[], fallback: string): string {
	try {
		return execFileSync('git', args, { encoding: 'utf8' }).trim() || fallback;
	} catch {
		return fallback;
	}
}

function medianOptional(values: Array<number | undefined>): number | undefined {
	const defined = values.filter((value): value is number => value !== undefined);
	return defined.length > 0 ? median(defined) : undefined;
}

function maxOptional(values: Array<number | undefined>): number | undefined {
	const defined = values.filter((value): value is number => value !== undefined);
	return defined.length > 0 ? Math.max(...defined) : undefined;
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
		'| Engine | Backend | Scene | Objects | Runs | FPS p5 median [range] | Frame p50 | Frame p95 median [range] | Frame p99 | Render p95 median [range] | Draw calls | Heap p95 (MiB) | Textures | Blur FBOs |',
		'|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
	];
	for (const row of rows) {
		lines.push(
			`| ${row.engine} ${row.version} | ${row.backend} | ${row.scene} | ${row.objects} | ${row.samples} | ${formatRange(row.fpsP5, row.fpsP5Min, row.fpsP5Max, 1)} | ${row.frameP50.toFixed(2)} | ${formatRange(row.frameP95, row.frameP95Min, row.frameP95Max, 2)} | ${row.frameP99.toFixed(2)} | ${formatRange(row.renderP95, row.renderP95Min, row.renderP95Max, 2)} | ${row.drawCalls.toFixed(1)} | ${formatBytes(row.heapP95)} | ${row.textureCount} | ${row.framebufferPoolSize ?? 'n/a'} |`,
		);
	}
	lines.push('', 'No overall winner is calculated; interpret results per workload.', '');
	return lines.join('\n');
}

function formatBytes(value: number | undefined): string {
	return value === undefined ? 'n/a' : (value / (1024 * 1024)).toFixed(1);
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
