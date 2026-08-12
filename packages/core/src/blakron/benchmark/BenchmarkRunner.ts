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
 * 纯状态机，管理 warmup/measuring/paused 状态。
 * 不依赖 Blakron 引擎，通过外部注入的回调与引擎交互。
 */
export class BenchmarkRunner {
	private phase: Phase = 'idle';
	private warmupFrames = 0;
	private readonly warmupTarget = 60;
	private currentSceneId: string | undefined;
	private currentCount = 0;
	private cleanup: (() => void) | undefined;

	constructor(
		private readonly collector: MetricsCollector,
		private readonly onPhaseChange: (phase: Phase) => void,
		private readonly getSceneDescriptor: (id: string) => SceneDescriptor | undefined,
		private readonly container: unknown,
	) {}

	/**
	 * 切换场景：销毁旧场景，重建新场景，重置 warmup
	 */
	switchScene(sceneId: string, count: number): void {
		// 1. 销毁旧场景
		if (this.cleanup) {
			this.cleanup();
			this.cleanup = undefined;
		}

		// 2. 找到场景描述符，构建新场景
		const descriptor = this.getSceneDescriptor(sceneId);
		if (descriptor) {
			this.cleanup = descriptor.build(this.container, count);
		}

		this.currentSceneId = sceneId;
		this.currentCount = count;

		// 3. 重置 warmup 状态
		this.warmupFrames = 0;
		this.phase = 'warmup';
		this.onPhaseChange(this.phase);

		// 4. 清空统计
		this.collector.reset();
	}

	/**
	 * 重建当前场景（对象数量变更）
	 */
	rebuildScene(count: number): void {
		if (this.currentSceneId !== undefined) {
			this.switchScene(this.currentSceneId, count);
		}
	}

	/**
	 * 暂停（仅在 measuring 状态有效）
	 */
	pause(): void {
		if (this.phase === 'measuring') {
			this.phase = 'paused';
			this.onPhaseChange(this.phase);
		}
	}

	/**
	 * 继续（仅在 paused 状态有效）
	 */
	resume(): void {
		if (this.phase === 'paused') {
			this.phase = 'measuring';
			this.onPhaseChange(this.phase);
		}
	}

	/**
	 * 重置测量：清空统计，重新进入 warmup
	 */
	resetMeasurement(): void {
		this.collector.reset();
		this.warmupFrames = 0;
		this.phase = 'warmup';
		this.onPhaseChange(this.phase);
	}

	/**
	 * 每帧回调（由外部 ENTER_FRAME 事件调用）
	 */
	onFrame(perf: { fps: number; drawCalls: number; renderTimeMs: number }): void {
		if (this.phase === 'idle' || this.phase === 'paused') {
			return;
		}

		if (this.phase === 'warmup') {
			this.warmupFrames++;
			if (this.warmupFrames >= this.warmupTarget) {
				this.phase = 'measuring';
				this.onPhaseChange(this.phase);
			}
			return;
		}

		// measuring 状态
		if (this.phase === 'measuring') {
			this.collector.record({
				fps: perf.fps,
				drawCalls: perf.drawCalls,
				renderTimeMs: perf.renderTimeMs,
				objectCount: this.currentCount,
			});
		}
	}

	/**
	 * 获取当前阶段
	 */
	getPhase(): Phase {
		return this.phase;
	}
}
