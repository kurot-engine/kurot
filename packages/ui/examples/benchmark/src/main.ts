import { createPlayer } from '@kurot/core';
import { createScenarioRoot, scenarios } from './scenarios.js';
import type { BenchmarkScenario, UIBenchmarkResult, ValidationMetrics } from './types.js';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const scenarioSelect = document.querySelector<HTMLSelectElement>('#scenario')!;
const warmupInput = document.querySelector<HTMLInputElement>('#warmup')!;
const framesInput = document.querySelector<HTMLInputElement>('#frames')!;
const runButton = document.querySelector<HTMLButtonElement>('#run')!;
const downloadButton = document.querySelector<HTMLButtonElement>('#download')!;
const status = document.querySelector<HTMLElement>('#status')!;
const metricsElement = document.querySelector<HTMLElement>('#metrics')!;
const summary = document.querySelector<HTMLElement>('#summary')!;

for (const scenario of scenarios) {
	const option = document.createElement('option');
	option.value = scenario.id;
	option.textContent = scenario.name;
	scenarioSelect.appendChild(option);
}

let lastResult: UIBenchmarkResult | undefined;
let running = false;

function percentile(values: readonly number[], ratio: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)]!;
}

function summarize(values: readonly number[]): { p50: number; p95: number; p99: number; max: number } {
	return {
		p50: percentile(values, 0.5),
		p95: percentile(values, 0.95),
		p99: percentile(values, 0.99),
		max: Math.max(...values, 0),
	};
}

function resetMetrics(): ValidationMetrics {
	return {
		commitProperties: 0,
		measure: 0,
		updateDisplayList: 0,
		rendererCreated: 0,
		rendererReused: 0,
		maxLiveRenderers: 0,
	};
}

function nextFrame(): Promise<number> {
	return new Promise(resolve => requestAnimationFrame(resolve));
}

async function runBenchmark(scenarioId: string, warmupFrames = 60, measuredFrames = 300): Promise<UIBenchmarkResult> {
	if (running) throw new Error('A benchmark is already running.');
	running = true;
	window.__UI_BENCHMARK_RESULT__ = undefined;
	status.dataset.state = 'running';
	status.textContent = 'Running';
	runButton.disabled = true;

	const scenario = scenarios.find(item => item.id === scenarioId);
	if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
	const root = createScenarioRoot();
	const app = createPlayer({ canvas, contentWidth: 800, contentHeight: 600, scaleMode: 'noScale', frameRate: 60 });
	const validation = resetMetrics();
	app.start(root);

	try {
		const setupStarted = performance.now();
		scenario.setup({ root, metrics: validation });
		const setupTimeMs = performance.now() - setupStarted;
		for (let frame = 0; frame < warmupFrames; frame++) {
			scenario.update(frame, { root, metrics: validation });
			await nextFrame();
		}

		validation.commitProperties = 0;
		validation.measure = 0;
		validation.updateDisplayList = 0;
		const frameTimes: number[] = [];
		const renderTimes: number[] = [];
		const drawCalls: number[] = [];
		let previous = performance.now();
		for (let frame = 0; frame < measuredFrames; frame++) {
			scenario.update(warmupFrames + frame, { root, metrics: validation });
			const now = await nextFrame();
			frameTimes.push(now - previous);
			previous = now;
			renderTimes.push(app.player.perf.renderTimeMs);
			drawCalls.push(app.player.perf.drawCalls);
		}

		const result: UIBenchmarkResult = {
			protocolVersion: 1,
			uiVersion: '1.1.7',
			coreVersion: '1.0.15',
			scenarioId: scenario.id,
			scenarioName: scenario.name,
			objectCount: scenario.objectCount,
			warmupFrames,
			measuredFrames,
			backend: app.player.isWebGL ? 'webgl' : 'canvas2d',
			setupTimeMs,
			frameTimeMs: summarize(frameTimes),
			renderTimeMs: summarize(renderTimes),
			drawCalls: { median: percentile(drawCalls, 0.5), max: Math.max(...drawCalls, 0) },
			validation: { ...validation },
			createdAt: new Date().toISOString(),
		};
		lastResult = result;
		window.__UI_BENCHMARK_RESULT__ = result;
		renderResult(result, scenario);
		status.dataset.state = 'ready';
		status.textContent = 'Complete';
		downloadButton.disabled = false;
		return result;
	} catch (error) {
		status.dataset.state = 'error';
		status.textContent = 'Failed';
		summary.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
		throw error;
	} finally {
		scenario.teardown({ root, metrics: validation });
		app.destroy();
		runButton.disabled = false;
		running = false;
	}
}

function renderResult(result: UIBenchmarkResult, scenario: BenchmarkScenario): void {
	const rows: Array<[string, string]> = [
		['Setup + first validation', `${result.setupTimeMs.toFixed(2)} ms`],
		['Frame P95', `${result.frameTimeMs.p95.toFixed(2)} ms`],
		['Render P95', `${result.renderTimeMs.p95.toFixed(2)} ms`],
		['Draw calls', result.drawCalls.median.toFixed(1)],
		['commitProperties', String(result.validation.commitProperties)],
		['measure', String(result.validation.measure)],
		['updateDisplayList', String(result.validation.updateDisplayList)],
		['Renderers created', String(result.validation.rendererCreated)],
		['Renderer data updates', String(result.validation.rendererReused)],
		['Max live renderers', String(result.validation.maxLiveRenderers)],
	];
	metricsElement.replaceChildren(...rows.flatMap(([label, value]) => {
		const key = document.createElement('span');
		key.textContent = label;
		const metric = document.createElement('strong');
		metric.textContent = value;
		return [key, metric];
	}));
	summary.textContent = `${scenario.description}\n\n${JSON.stringify(result, undefined, 2)}`;
}

window.__UI_BENCHMARK_RUN__ = runBenchmark;

runButton.addEventListener('click', () => {
	void runBenchmark(scenarioSelect.value, Number(warmupInput.value), Number(framesInput.value));
});

downloadButton.addEventListener('click', () => {
	if (!lastResult) return;
	const url = URL.createObjectURL(new Blob([JSON.stringify(lastResult, undefined, 2)], { type: 'application/json' }));
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = `ui-benchmark-${lastResult.scenarioId}.json`;
	anchor.click();
	URL.revokeObjectURL(url);
});
