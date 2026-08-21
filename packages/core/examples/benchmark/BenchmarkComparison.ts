import { BENCHMARK_PROTOCOL_VERSION, DEFAULT_BENCHMARK_SEED } from './runtime/BenchmarkProtocol.js';
import { MetricsCollector } from './runtime/MetricsCollector.js';
import { ReportExporter } from './runtime/ReportExporter.js';
import type { BenchmarkEnvironment, ReportData } from './runtime/types.js';
import type { BenchmarkAdapter, BenchmarkBackend } from './BenchmarkAdapter.js';
import { EgretBenchmarkAdapter } from './EgretBenchmarkAdapter.js';
import { KurotBenchmarkAdapter } from './KurotBenchmarkAdapter.js';
import { PixiBenchmarkAdapter } from './PixiBenchmarkAdapter.js';
import { getScenario, scenarios } from './Scenarios.js';

type EngineId = 'kurot' | 'pixi' | 'egret';
type BenchmarkStatus = 'initializing' | 'warmup' | 'measuring' | 'complete' | 'error';

interface BenchmarkState {
	status: BenchmarkStatus;
	result?: ReportData;
	error?: string;
}

declare global {
	interface Window {
		__KUROT_BENCHMARK__: BenchmarkState;
	}
}

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;

const params = new URLSearchParams(location.search);
const engine = readEngine(params.get('engine'));
const requestedBackend = readBackend(params.get('backend'), engine);
const scenarioId = params.get('scene') ?? 'sprite-batch';
const scenario = getScenario(scenarioId) ?? scenarios[0];
const count = readInteger(params.get('count'), scenario.defaultCount, scenario.minCount, scenario.maxCount);
const seed = readInteger(params.get('seed'), DEFAULT_BENCHMARK_SEED, 0, 0xffffffff);
const warmupFrames = readInteger(params.get('warmup'), 60, 0, 10000);
const measuredFrames = readInteger(params.get('frames'), 300, 1, 100000);
const run = readInteger(params.get('run'), 1, 1, 10000);
const resolution = readInteger(params.get('resolution'), 1, 1, 4);
const browser = params.get('browser') ?? 'manual';
const runMode = params.get('mode') === 'headless' ? 'headless' : 'headed';

const exporter = new ReportExporter();
const state: BenchmarkState = { status: 'initializing' };
window.__KUROT_BENCHMARK__ = state;

initializeControls();
void runBenchmark().catch((error: unknown) => {
	state.error = error instanceof Error ? error.stack ?? error.message : String(error);
	setStatus('error', 'Error');
	setText('error', state.error);
});

async function runBenchmark(): Promise<void> {
	const canvas = getElement<HTMLCanvasElement>('gameCanvas');
	const adapter = createAdapter(engine);
	await adapter.initialize(canvas, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, resolution, requestedBackend);
	window.addEventListener('pagehide', () => adapter.destroy(), { once: true });
	if (canvas.width !== VIEWPORT_WIDTH * resolution || canvas.height !== VIEWPORT_HEIGHT * resolution) {
		throw new Error(
			`Unexpected backing size ${canvas.width}x${canvas.height}; expected ${VIEWPORT_WIDTH * resolution}x${VIEWPORT_HEIGHT * resolution}.`,
		);
	}
	const runtime = scenario.build(adapter, count, seed);
	const collector = new MetricsCollector(measuredFrames);

	setText('engine-value', `${adapter.engine} ${adapter.version} / ${adapter.backend}`);
	setStatus(warmupFrames > 0 ? 'warmup' : 'measuring', warmupFrames > 0 ? 'Warmup' : 'Measuring');

	let frame = 0;
	let previousTimestamp: number | undefined;
	await new Promise<void>(resolve => {
		const tick = (timestamp: number): void => {
			const frameTimeMs = previousTimestamp === undefined ? 1000 / 60 : timestamp - previousTimestamp;
			previousTimestamp = timestamp;
			runtime.update(frame);
			const metrics = adapter.render();

			if (frame >= warmupFrames) {
				if (state.status !== 'measuring') {
					setStatus('measuring', 'Measuring');
				}
				collector.record({
					fps: frameTimeMs > 0 ? 1000 / frameTimeMs : 0,
					drawCalls: metrics.drawCalls,
					frameTimeMs,
					renderTimeMs: metrics.renderTimeMs,
					objectCount: count,
				});
				updateMetrics(collector);
			}

			frame++;
			const totalFrames = warmupFrames + measuredFrames;
			const completedFrames = Math.min(frame, totalFrames);
			setText('progress', `${completedFrames} / ${totalFrames}`);
			getElement<HTMLDivElement>('progress-bar').style.width = `${(completedFrames / totalFrames) * 100}%`;
			if (frame < totalFrames) {
				requestAnimationFrame(tick);
				return;
			}
			resolve();
		};
		requestAnimationFrame(tick);
	});

	const environment: BenchmarkEnvironment = {
		protocolVersion: BENCHMARK_PROTOCOL_VERSION,
		engine: adapter.engine,
		engineVersion: adapter.version,
		backend: adapter.backend,
		browser,
		runMode,
		scenarioVersion: scenario.version,
		seed,
		viewportWidth: VIEWPORT_WIDTH,
		viewportHeight: VIEWPORT_HEIGHT,
		devicePixelRatio: globalThis.devicePixelRatio,
		resolution,
		antialias: false,
		warmupFrames,
		measuredFrames,
		run,
	};
	state.result = exporter.buildReport(scenario.id, count, collector.getStats(), environment);
	setStatus('complete', 'Complete');
	getElement<HTMLButtonElement>('export').disabled = false;
	getElement<HTMLButtonElement>('copy').disabled = false;
	document.dispatchEvent(new CustomEvent('benchmark-complete', { detail: state.result }));
	runtime.destroy();
}

function initializeControls(): void {
	const engineSelect = getElement<HTMLSelectElement>('engine');
	engineSelect.value = engine;
	const backendSelect = getElement<HTMLSelectElement>('backend');
	backendSelect.value = requestedBackend;
	syncBackendOptions(engineSelect, backendSelect);
	engineSelect.addEventListener('change', () => syncBackendOptions(engineSelect, backendSelect));
	const sceneSelect = getElement<HTMLSelectElement>('scene');
	for (const item of scenarios) {
		const option = document.createElement('option');
		option.value = item.id;
		option.textContent = item.label;
		sceneSelect.append(option);
	}
	sceneSelect.value = scenario.id;
	getElement<HTMLInputElement>('count').value = String(count);
	getElement<HTMLInputElement>('warmup').value = String(warmupFrames);
	getElement<HTMLInputElement>('frames').value = String(measuredFrames);
	getElement<HTMLButtonElement>('run').addEventListener('click', () => {
		const next = new URLSearchParams({
			engine: engineSelect.value,
			backend: backendSelect.value,
			scene: sceneSelect.value,
			count: getElement<HTMLInputElement>('count').value,
			warmup: getElement<HTMLInputElement>('warmup').value,
			frames: getElement<HTMLInputElement>('frames').value,
			seed: String(seed),
			resolution: String(resolution),
		});
		location.search = next.toString();
	});
	getElement<HTMLButtonElement>('export').addEventListener('click', () => {
		if (state.result) {
			exporter.exportJSON(state.result);
		}
	});
	getElement<HTMLButtonElement>('copy').addEventListener('click', async () => {
		if (state.result) {
			await exporter.copyMarkdown(state.result);
		}
	});
	setText('scenario-value', `${scenario.label} / ${count} objects / seed ${seed}`);
}

function updateMetrics(collector: MetricsCollector): void {
	const stats = collector.getStats();
	setText('fps', `${stats.fps.avg.toFixed(1)} avg / ${stats.fps.p5.toFixed(1)} p5`);
	setText('frame-time', `${stats.frame.p50.toFixed(2)} p50 / ${stats.frame.p95.toFixed(2)} p95 / ${stats.frame.p99.toFixed(2)} p99`);
	setText('render-time', `${stats.render.p50.toFixed(2)} p50 / ${stats.render.p95.toFixed(2)} p95`);
	setText('draw-calls', stats.drawCalls.avg.toFixed(1));
}

function createAdapter(id: EngineId): BenchmarkAdapter {
	switch (id) {
		case 'egret':
			return new EgretBenchmarkAdapter();
		case 'pixi':
			return new PixiBenchmarkAdapter();
		case 'kurot':
			return new KurotBenchmarkAdapter();
	}
}

function readEngine(value: string | null): EngineId {
	return value === 'pixi' || value === 'egret' ? value : 'kurot';
}


function readBackend(value: string | null, selectedEngine: EngineId): BenchmarkBackend {
	if (selectedEngine === 'egret') {
		return 'webgl1';
	}
	return value === 'webgl1' ? 'webgl1' : 'webgl2';
}

function syncBackendOptions(engineSelect: HTMLSelectElement, backendSelect: HTMLSelectElement): void {
	const webgl2Option = backendSelect.querySelector<HTMLOptionElement>('option[value="webgl2"]');
	if (!webgl2Option) {
		throw new Error('Missing WebGL 2 benchmark option.');
	}
	const egretSelected = engineSelect.value === 'egret';
	webgl2Option.disabled = egretSelected;
	if (egretSelected) {
		backendSelect.value = 'webgl1';
	}
}

function readInteger(value: string | null, fallback: number, min: number, max: number): number {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function getElement<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id);
	if (!element) throw new Error(`Missing benchmark element: ${id}`);
	return element as T;
}

function setText(id: string, value: string): void {
	getElement(id).textContent = value;
}

function setStatus(status: BenchmarkStatus, label: string): void {
	state.status = status;
	const element = getElement<HTMLDivElement>('status');
	element.textContent = label;
	element.className = `status-badge ${statusClass(status)}`;
}

function statusClass(status: BenchmarkStatus): string {
	switch (status) {
		case 'initializing':
		case 'warmup':
			return 'badge-loading';
		case 'measuring':
			return 'badge-playing';
		case 'complete':
			return 'badge-ready';
		case 'error':
			return 'badge-error';
	}
}
