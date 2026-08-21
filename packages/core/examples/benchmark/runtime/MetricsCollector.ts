import type { FrameData, Stats } from './types.js';

/**
 * Returns a percentile from an ascending numeric array.
 */
export function percentile(sortedArr: number[], p: number): number {
	if (sortedArr.length === 0) return 0;
	const idx = Math.ceil(p * sortedArr.length) - 1;
	const clamped = Math.max(0, Math.min(idx, sortedArr.length - 1));
	return sortedArr[clamped];
}

/**
 * Collects frame metrics in a fixed-size rolling window.
 */
export class MetricsCollector {
	// ── Instance fields ──────────────────────────────────────────────────────────

	private readonly _windowSize: number;
	private readonly _buffer: Array<FrameData | undefined>;

	private _writeIndex = 0;
	private _frameCount = 0;

	// ── Constructor ────────────────────────────────────────────────────────────

	public constructor(windowSize = 300) {
		this._windowSize = windowSize;
		this._buffer = new Array<FrameData | undefined>(windowSize);
	}

	// ── Public methods ──────────────────────────────────────────────────────────

	public record(frame: FrameData): void {
		this._buffer[this._writeIndex] = frame;
		this._writeIndex = (this._writeIndex + 1) % this._windowSize;
		if (this._frameCount < this._windowSize) {
			this._frameCount++;
		}
	}

	public reset(): void {
		this._writeIndex = 0;
		this._frameCount = 0;
		for (let i = 0; i < this._windowSize; i++) {
			this._buffer[i] = undefined;
		}
	}

	/**
	 * Reports sustained frame times above 33.3 ms over the latest ten frames.
	 */
	public isLowFps(): boolean {
		if (this._frameCount < 10) return false;

		for (let i = 0; i < 10; i++) {
			const idx = (this._writeIndex - 1 - i + this._windowSize) % this._windowSize;
			const frame = this._buffer[idx];
			if (!frame || frame.frameTimeMs <= 33.3) {
				return false;
			}
		}
		return true;
	}

	public getStats(): Stats {
		if (this._frameCount === 0) {
			return {
				frameCount: 0,
				fps: { current: 0, avg: 0, p5: 0, p50: 0, p95: 0, p99: 0, max: 0 },
				frame: { current: 0, avg: 0, p5: 0, p50: 0, p95: 0, p99: 0, max: 0 },
				render: { current: 0, avg: 0, p5: 0, p50: 0, p95: 0, p99: 0, max: 0 },
				drawCalls: { current: 0, avg: 0 },
				batchEfficiency: 0,
				isLowFps: false,
			};
		}

		const fpsValues: number[] = [];
		const frameValues: number[] = [];
		const renderValues: number[] = [];
		const drawCallValues: number[] = [];

		for (let i = 0; i < this._frameCount; i++) {
			const idx = (this._writeIndex - this._frameCount + i + this._windowSize * 2) % this._windowSize;
			const frame = this._buffer[idx];
			if (frame) {
				fpsValues.push(frame.fps);
				frameValues.push(frame.frameTimeMs);
				renderValues.push(frame.renderTimeMs);
				drawCallValues.push(frame.drawCalls);
			}
		}

		const latestIdx = (this._writeIndex - 1 + this._windowSize) % this._windowSize;
		const latestFrame = this._buffer[latestIdx];

		const sortedFps = [...fpsValues].sort((a, b) => a - b);
		const sortedFrame = [...frameValues].sort((a, b) => a - b);
		const sortedRender = [...renderValues].sort((a, b) => a - b);

		const avgFps = fpsValues.reduce((s, v) => s + v, 0) / fpsValues.length;
		const avgFrame = frameValues.reduce((s, v) => s + v, 0) / frameValues.length;
		const avgRender = renderValues.reduce((s, v) => s + v, 0) / renderValues.length;
		const avgDrawCalls = drawCallValues.reduce((s, v) => s + v, 0) / drawCallValues.length;

		const batchEfficiency =
			latestFrame && latestFrame.drawCalls > 0 ? latestFrame.objectCount / latestFrame.drawCalls : 0;

		return {
			frameCount: this._frameCount,
			fps: {
				current: latestFrame?.fps ?? 0,
				avg: avgFps,
				p5: percentile(sortedFps, 0.05),
				p50: percentile(sortedFps, 0.5),
				p95: percentile(sortedFps, 0.95),
				p99: percentile(sortedFps, 0.99),
				max: sortedFps[sortedFps.length - 1] ?? 0,
			},
			frame: {
				current: latestFrame?.frameTimeMs ?? 0,
				avg: avgFrame,
				p5: percentile(sortedFrame, 0.05),
				p50: percentile(sortedFrame, 0.5),
				p95: percentile(sortedFrame, 0.95),
				p99: percentile(sortedFrame, 0.99),
				max: sortedFrame[sortedFrame.length - 1] ?? 0,
			},
			render: {
				current: latestFrame?.renderTimeMs ?? 0,
				avg: avgRender,
				p5: percentile(sortedRender, 0.05),
				p50: percentile(sortedRender, 0.5),
				p95: percentile(sortedRender, 0.95),
				p99: percentile(sortedRender, 0.99),
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
