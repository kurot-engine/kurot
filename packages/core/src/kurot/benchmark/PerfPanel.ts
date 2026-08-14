import type { Stats } from './types.js';
import type { Phase } from './BenchmarkRunner.js';

export type FpsColorClass = 'good' | 'warn' | 'bad';

export function fpsColorClass(fps: number): FpsColorClass {
	if (fps >= 55) return 'good';
	if (fps >= 30) return 'warn';
	return 'bad';
}

export interface PerfPanelElements {
	fps: HTMLElement;
	drawCalls: HTMLElement;
	renderCurrent: HTMLElement;
	renderAvg: HTMLElement;
	renderP95: HTMLElement;
	batchEfficiency: HTMLElement;
	frameCount: HTMLElement;
	status: HTMLElement;
	graphCanvas: HTMLCanvasElement;
}

export class PerfPanel {
	// ── Instance fields ──────────────────────────────────────────────────────────

	private _fpsHistory: number[] = new Array(200).fill(0);
	private _historyWriteIndex = 0;

	// ── Constructor ───────────────────────────────────────────────────────────

	public constructor(private readonly _elements: PerfPanelElements) {}

	// ── Public methods ──────────────────────────────────────────────────────────

	public update(stats: Stats, phase: Phase): void {
		if (phase === 'warmup') {
			this._elements.status.textContent = 'Warming up…';
			const dimmed = 'dimmed';
			const valueEls = [
				this._elements.fps,
				this._elements.drawCalls,
				this._elements.renderCurrent,
				this._elements.renderAvg,
				this._elements.renderP95,
				this._elements.batchEfficiency,
				this._elements.frameCount,
			];
			for (const el of valueEls) {
				el.textContent = '--';
				el.className = dimmed;
			}
		} else if (phase === 'measuring') {
			this._elements.status.textContent = 'Measuring';

			const valueEls = [
				this._elements.fps,
				this._elements.drawCalls,
				this._elements.renderCurrent,
				this._elements.renderAvg,
				this._elements.renderP95,
				this._elements.batchEfficiency,
				this._elements.frameCount,
			];
			for (const el of valueEls) {
				el.className = '';
			}

			this._elements.fps.textContent = stats.fps.current.toFixed(1);
			this._elements.drawCalls.textContent = String(stats.drawCalls.current);
			this._elements.renderCurrent.textContent = stats.render.current.toFixed(2) + ' ms';
			this._elements.renderAvg.textContent = stats.render.avg.toFixed(2) + ' ms';
			this._elements.renderP95.textContent = stats.render.p95.toFixed(2) + ' ms';
			this._elements.batchEfficiency.textContent = stats.batchEfficiency.toFixed(1) + 'x';
			this._elements.frameCount.textContent = String(stats.frameCount);

			this._fpsHistory[this._historyWriteIndex] = stats.fps.current;
			this._historyWriteIndex = (this._historyWriteIndex + 1) % 200;
		} else if (phase === 'paused') {
			this._elements.status.textContent = 'Paused';
		}

		this._drawGraph(this._fpsHistory, this._historyWriteIndex);
	}

	// ── Private methods ─────────────────────────────────────────────────────────

	private _drawGraph(fpsHistory: number[], writeIdx: number): void {
		const canvas = this._elements.graphCanvas;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const width = canvas.width;
		const height = canvas.height;
		const maxFps = 70;
		const refFps = 60;

		ctx.fillStyle = '#111';
		ctx.fillRect(0, 0, width, height);

		const refY = height - (refFps / maxFps) * height;
		ctx.strokeStyle = '#444';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, refY);
		ctx.lineTo(width, refY);
		ctx.stroke();

		const len = fpsHistory.length;
		ctx.lineWidth = 1;

		for (let i = 0; i < len; i++) {
			const sampleIdx = (writeIdx + i) % len;
			const fps = fpsHistory[sampleIdx];
			const x = i;
			const y = height - Math.min(fps / maxFps, 1) * height;

			const colorClass = fpsColorClass(fps);
			if (colorClass === 'good') {
				ctx.strokeStyle = '#4caf50';
			} else if (colorClass === 'warn') {
				ctx.strokeStyle = '#ffeb3b';
			} else {
				ctx.strokeStyle = '#f44336';
			}

			if (i === 0) {
				ctx.beginPath();
				ctx.moveTo(x, y);
			} else {
				const prevSampleIdx = (writeIdx + i - 1) % len;
				const prevFps = fpsHistory[prevSampleIdx];
				const prevColorClass = fpsColorClass(prevFps);

				if (prevColorClass !== colorClass) {
					ctx.lineTo(x, y);
					ctx.stroke();
					ctx.beginPath();
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}

			if (i === len - 1) {
				ctx.stroke();
			}
		}
	}
}
