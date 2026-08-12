import type { FrameData, Stats } from './types.js';

/**
 * 计算排序数组的百分位数
 * @param sortedArr 已排序的数组
 * @param p 百分位（0-1）
 */
export function percentile(sortedArr: number[], p: number): number {
	if (sortedArr.length === 0) return 0;
	const idx = Math.ceil(p * sortedArr.length) - 1;
	const clamped = Math.max(0, Math.min(idx, sortedArr.length - 1));
	return sortedArr[clamped];
}

/**
 * 使用 ring buffer 维护 300 帧滑动窗口的指标采集器
 */
export class MetricsCollector {
	private readonly windowSize: number;
	private readonly buffer: FrameData[];
	private writeIdx: number = 0;
	private frameCount: number = 0;

	constructor(windowSize: number = 300) {
		this.windowSize = windowSize;
		this.buffer = new Array<FrameData>(windowSize);
	}

	/**
	 * 写入一帧数据到 ring buffer
	 */
	record(frame: FrameData): void {
		this.buffer[this.writeIdx] = frame;
		this.writeIdx = (this.writeIdx + 1) % this.windowSize;
		if (this.frameCount < this.windowSize) {
			this.frameCount++;
		}
	}

	/**
	 * 清空所有历史数据，重置写指针和帧计数
	 */
	reset(): void {
		this.writeIdx = 0;
		this.frameCount = 0;
		// 清空 buffer 引用
		for (let i = 0; i < this.windowSize; i++) {
			this.buffer[i] = undefined as unknown as FrameData;
		}
	}

	/**
	 * 连续 10 帧 renderTimeMs > 33.3ms 时返回 true
	 */
	isLowFps(): boolean {
		if (this.frameCount < 10) return false;

		// 从最近写入的帧往回检查 10 帧
		for (let i = 0; i < 10; i++) {
			const idx = (this.writeIdx - 1 - i + this.windowSize) % this.windowSize;
			const frame = this.buffer[idx];
			if (!frame || frame.renderTimeMs <= 33.3) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 计算并返回统计结果
	 */
	getStats(): Stats {
		if (this.frameCount === 0) {
			return {
				frameCount: 0,
				fps: { current: 0, avg: 0, p50: 0, p95: 0, max: 0 },
				render: { current: 0, avg: 0, p50: 0, p95: 0, max: 0 },
				drawCalls: { current: 0, avg: 0 },
				batchEfficiency: 0,
				isLowFps: false,
			};
		}

		// 收集有效帧数据
		const fpsValues: number[] = [];
		const renderValues: number[] = [];
		const drawCallValues: number[] = [];

		for (let i = 0; i < this.frameCount; i++) {
			const idx = (this.writeIdx - this.frameCount + i + this.windowSize * 2) % this.windowSize;
			const frame = this.buffer[idx];
			if (frame) {
				fpsValues.push(frame.fps);
				renderValues.push(frame.renderTimeMs);
				drawCallValues.push(frame.drawCalls);
			}
		}

		// 最新帧（writeIdx - 1）
		const latestIdx = (this.writeIdx - 1 + this.windowSize) % this.windowSize;
		const latestFrame = this.buffer[latestIdx];

		const sortedFps = [...fpsValues].sort((a, b) => a - b);
		const sortedRender = [...renderValues].sort((a, b) => a - b);

		const avgFps = fpsValues.reduce((s, v) => s + v, 0) / fpsValues.length;
		const avgRender = renderValues.reduce((s, v) => s + v, 0) / renderValues.length;
		const avgDrawCalls = drawCallValues.reduce((s, v) => s + v, 0) / drawCallValues.length;

		const batchEfficiency =
			latestFrame && latestFrame.drawCalls > 0 ? latestFrame.objectCount / latestFrame.drawCalls : 0;

		return {
			frameCount: this.frameCount,
			fps: {
				current: latestFrame?.fps ?? 0,
				avg: avgFps,
				p50: percentile(sortedFps, 0.5),
				p95: percentile(sortedFps, 0.95),
				max: sortedFps[sortedFps.length - 1] ?? 0,
			},
			render: {
				current: latestFrame?.renderTimeMs ?? 0,
				avg: avgRender,
				p50: percentile(sortedRender, 0.5),
				p95: percentile(sortedRender, 0.95),
				max: sortedRender[sortedRender.length - 1] ?? 0,
			},
			drawCalls: {
				current: latestFrame?.drawCalls ?? 0,
				avg: avgDrawCalls,
			},
			batchEfficiency,
			isLowFps: this.isLowFps(),
		};
	}
}
