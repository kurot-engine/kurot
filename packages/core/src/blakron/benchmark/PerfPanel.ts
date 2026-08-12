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
	private fpsHistory: number[] = new Array(200).fill(0);
	private historyWriteIdx = 0;

	constructor(private readonly els: PerfPanelElements) {}

	update(stats: Stats, phase: Phase): void {
		if (phase === 'warmup') {
			this.els.status.textContent = '预热中…';
			const dimmed = 'dimmed';
			const valueEls = [
				this.els.fps,
				this.els.drawCalls,
				this.els.renderCurrent,
				this.els.renderAvg,
				this.els.renderP95,
				this.els.batchEfficiency,
				this.els.frameCount,
			];
			for (const el of valueEls) {
				el.textContent = '--';
				el.className = dimmed;
			}
		} else if (phase === 'measuring') {
			this.els.status.textContent = '测量中';

			// Clear dimmed class
			const valueEls = [
				this.els.fps,
				this.els.drawCalls,
				this.els.renderCurrent,
				this.els.renderAvg,
				this.els.renderP95,
				this.els.batchEfficiency,
				this.els.frameCount,
			];
			for (const el of valueEls) {
				el.className = '';
			}

			this.els.fps.textContent = stats.fps.current.toFixed(1);
			this.els.drawCalls.textContent = String(stats.drawCalls.current);
			this.els.renderCurrent.textContent = stats.render.current.toFixed(2) + ' ms';
			this.els.renderAvg.textContent = stats.render.avg.toFixed(2) + ' ms';
			this.els.renderP95.textContent = stats.render.p95.toFixed(2) + ' ms';
			this.els.batchEfficiency.textContent = stats.batchEfficiency.toFixed(1) + 'x';
			this.els.frameCount.textContent = String(stats.frameCount);

			// Update fps history ring buffer
			this.fpsHistory[this.historyWriteIdx] = stats.fps.current;
			this.historyWriteIdx = (this.historyWriteIdx + 1) % 200;
		} else if (phase === 'paused') {
			this.els.status.textContent = '已暂停';
			// Keep current values, just update status
		}

		this._drawGraph(this.fpsHistory, this.historyWriteIdx);
	}

	_drawGraph(fpsHistory: number[], writeIdx: number): void {
		const canvas = this.els.graphCanvas;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const width = canvas.width; // 200
		const height = canvas.height; // 60
		const maxFps = 70;
		const refFps = 60;

		// Clear
		ctx.fillStyle = '#111';
		ctx.fillRect(0, 0, width, height);

		// Draw 60 FPS reference line
		const refY = height - (refFps / maxFps) * height;
		ctx.strokeStyle = '#444';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, refY);
		ctx.lineTo(width, refY);
		ctx.stroke();

		// Draw FPS polyline with color segments
		const len = fpsHistory.length; // 200
		ctx.lineWidth = 1;

		for (let i = 0; i < len; i++) {
			// The oldest sample is at writeIdx, newest is at writeIdx - 1
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
				// Check if color changed from previous sample
				const prevSampleIdx = (writeIdx + i - 1) % len;
				const prevFps = fpsHistory[prevSampleIdx];
				const prevColorClass = fpsColorClass(prevFps);

				if (prevColorClass !== colorClass) {
					// End previous segment and start new one
					ctx.lineTo(x, y);
					ctx.stroke();
					ctx.beginPath();
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}

			// Stroke the last segment
			if (i === len - 1) {
				ctx.stroke();
			}
		}
	}
}
