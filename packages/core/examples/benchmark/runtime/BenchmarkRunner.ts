import type { MetricsCollector } from './MetricsCollector.js';

export type Phase = 'idle' | 'warmup' | 'measuring' | 'paused';

export interface SceneDescriptor {
	id: string;
	label?: string;
	defaultCount?: number;
	minCount?: number;
	maxCount?: number;
	build(container: unknown, count: number): () => void;
}

/**
 * Coordinates benchmark scene transitions and measurement phases.
 */
export class BenchmarkRunner {
	// ── Instance fields ──────────────────────────────────────────────────────────

	private readonly _warmupTarget = 60;
	private _phase: Phase = 'idle';
	private _warmupFrames = 0;
	private _currentSceneId?: string;
	private _currentCount = 0;
	private _cleanup?: () => void;

	// ── Constructor ─────────────────────────────────────────────────────────────

	public constructor(
		private readonly _collector: MetricsCollector,
		private readonly _onPhaseChange: (phase: Phase) => void,
		private readonly _getSceneDescriptor: (id: string) => SceneDescriptor | undefined,
		private readonly _container: unknown,
	) {}

	// ── Public methods ────────────────────────────────────────────────────────────

	/**
	 * Switches the active scene and starts a new warmup phase.
	 */
	public switchScene(sceneId: string, count: number): void {
		if (this._cleanup) {
			this._cleanup();
			this._cleanup = undefined;
		}

		const descriptor = this._getSceneDescriptor(sceneId);
		if (descriptor) {
			this._cleanup = descriptor.build(this._container, count);
		}

		this._currentSceneId = sceneId;
		this._currentCount = count;

		this._warmupFrames = 0;
		this._phase = 'warmup';
		this._onPhaseChange(this._phase);

		this._collector.reset();
	}

	public rebuildScene(count: number): void {
		if (this._currentSceneId !== undefined) {
			this.switchScene(this._currentSceneId, count);
		}
	}

	public pause(): void {
		if (this._phase === 'measuring') {
			this._phase = 'paused';
			this._onPhaseChange(this._phase);
		}
	}

	public resume(): void {
		if (this._phase === 'paused') {
			this._phase = 'measuring';
			this._onPhaseChange(this._phase);
		}
	}

	public resetMeasurement(): void {
		this._collector.reset();
		this._warmupFrames = 0;
		this._phase = 'warmup';
		this._onPhaseChange(this._phase);
	}

	/**
	 * Records one frame while measurement is active.
	 */
	public onFrame(perf: { fps: number; drawCalls: number; frameTimeMs?: number; renderTimeMs: number }): void {
		if (this._phase === 'idle' || this._phase === 'paused') {
			return;
		}

		if (this._phase === 'warmup') {
			this._warmupFrames++;
			if (this._warmupFrames >= this._warmupTarget) {
				this._phase = 'measuring';
				this._onPhaseChange(this._phase);
			}
			return;
		}

		if (this._phase === 'measuring') {
			this._collector.record({
				fps: perf.fps,
				drawCalls: perf.drawCalls,
				frameTimeMs: perf.frameTimeMs ?? (perf.fps > 0 ? 1000 / perf.fps : 0),
				renderTimeMs: perf.renderTimeMs,
				objectCount: this._currentCount,
			});
		}
	}

	public getPhase(): Phase {
		return this._phase;
	}
}
