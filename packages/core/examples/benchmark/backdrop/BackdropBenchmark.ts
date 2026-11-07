import { BackdropBlur, createPlayer, Sprite } from '../../../src/index.js';
import type { WebGLRenderContext } from '../../../src/index.js';

interface TimerExtension {
	TIME_ELAPSED_EXT: number;
	GPU_DISJOINT_EXT: number;
}

export interface BackdropTiming {
	name: string;
	medianMs: number;
	p95Ms: number;
	poolMiB: number;
	gpuSamplesMs: number[];
}

export interface BackdropBenchmarkReport {
	renderer: string;
	backing: number[];
	samples: number;
	antialias: boolean;
	results: BackdropTiming[];
}

declare global {
	interface Window {
		runBackdropBenchmark(samples?: number, antialias?: boolean): Promise<BackdropBenchmarkReport>;
	}
}

/**
 * Entire-frame GPU elapsed time, including copies, draw calls and presentation.
 * Timer queries finish asynchronously; CPU submission/finish time is not GPU time.
 */
export async function runBackdropBenchmark(samples = 30, antialias?: boolean): Promise<BackdropBenchmarkReport> {
	if (!Number.isInteger(samples) || samples < 1 || samples > 300) {
		throw new RangeError('Benchmark samples must be an integer from 1 to 300.');
	}
	const canvas = document.querySelector('canvas')!;
	if (antialias === false) {
		canvas.getContext('webgl2', { antialias: false, depth: false, stencil: true });
	}
	const app = createPlayer({ canvas, contentWidth: 960, contentHeight: 540, resolution: 2, scaleMode: 'showAll' });
	const context = Reflect.get(app.player, '_webglContext') as WebGLRenderContext | undefined;
	if (!context?.isWebGL2) {
		app.destroy();
		throw new Error('GPU benchmark requires WebGL 2 timer queries.');
	}
	const gl = context.gl as WebGL2RenderingContext;
	const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null;
	if (!timer) {
		app.destroy();
		throw new Error('GPU timer queries are unavailable on this browser.');
	}
	const background = new Sprite();
	for (let i = 0; i < 32; i++) {
		background.graphics.beginFill([0x102a43, 0x3b82f6, 0x34d399, 0xf472b6][i % 4]);
		background.graphics.drawRect(i % 8 * 120, Math.floor(i / 8) * 135, 120, 135);
		background.graphics.endFill();
	}
	app.stage.addChild(background);
	const effect = new BackdropBlur({ width: 960, height: 540, blurX: 12, blurY: 12 });
	app.stage.addChild(effect);
	const scenarios = [
		{ name: 'baseline', visible: false, width: 960, height: 540, quality: 1, resolution: undefined },
		{ name: 'regional r2 Q1', visible: true, width: 480, height: 330, quality: 1, resolution: undefined },
		{ name: 'full r2 Q1', visible: true, width: 960, height: 540, quality: 1, resolution: undefined },
		{ name: 'full r2 Q2', visible: true, width: 960, height: 540, quality: 2, resolution: undefined },
		{ name: 'full r1 Q1', visible: true, width: 960, height: 540, quality: 1, resolution: 1 },
		{ name: 'full r0.5 Q1', visible: true, width: 960, height: 540, quality: 1, resolution: 0.5 },
		{ name: 'regional r0.5 Q1', visible: true, width: 480, height: 330, quality: 1, resolution: 0.5 },
		{ name: 'full radius48 r2 Q1', visible: true, width: 960, height: 540, quality: 1, resolution: undefined, radius: 48 },
		{ name: 'full radius96 r2 Q1', visible: true, width: 960, height: 540, quality: 1, resolution: undefined, radius: 96 },
	];
	const debug = gl.getExtension('WEBGL_debug_renderer_info');
	const report: BackdropBenchmarkReport = {
		renderer: String(gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)),
		backing: [canvas.width, canvas.height], samples, antialias: gl.getContextAttributes()?.antialias ?? false, results: [],
	};
	try {
		for (const scenario of scenarios) {
			context.releaseFilterResources();
			Object.assign(effect, scenario);
			effect.blurX = effect.blurY = scenario.radius ?? 12;
			for (let i = 0; i < 12; i++) {
				app.player.render(false, 0);
				context.flush();
			}
			const times: number[] = [];
			for (let i = 0; i < samples; i++) {
				const query = gl.createQuery();
				if (!query) {
					throw new Error('Cannot allocate a GPU timer query.');
				}
				let active = false;
				try {
					gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
					active = true;
					background.x = i % 3;
					app.player.render(false, 0);
					context.flush();
					gl.endQuery(timer.TIME_ELAPSED_EXT);
					active = false;
					const deadline = performance.now() + 5000;
					while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
						if (performance.now() > deadline) {
							throw new Error('GPU timer query timed out.');
						}
						await new Promise<void>(resolve => setTimeout(resolve, 4));
					}
					if (gl.getParameter(timer.GPU_DISJOINT_EXT)) {
						throw new Error('GPU clock changed; discard this benchmark run.');
					}
					times.push(Number(gl.getQueryParameter(query, gl.QUERY_RESULT)) / 1e6);
				} finally {
					if (active) {
						gl.endQuery(timer.TIME_ELAPSED_EXT);
					}
					gl.deleteQuery(query);
				}
			}
			times.sort((a, b) => a - b);
			report.results.push({
				name: scenario.name, medianMs: times[Math.floor(times.length / 2)],
				p95Ms: times[Math.min(times.length - 1, Math.floor(times.length * 0.95))],
				poolMiB: app.player.framebufferPoolBytes / 1048576,
				gpuSamplesMs: times,
			});
		}
		if (gl.getError() !== gl.NO_ERROR) {
			throw new Error('WebGL error during backdrop measurement.');
		}
		return report;
	} finally {
		app.destroy();
	}
}

window.runBackdropBenchmark = runBackdropBenchmark;
