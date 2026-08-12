import type { Stats, ReportData } from './types.js';

export class ReportExporter {
	// 生成报告对象
	buildReport(sceneId: string, objectCount: number, stats: Stats): ReportData {
		return {
			timestamp: new Date().toISOString(),
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
			scene: sceneId,
			objectCount,
			fps: {
				avg: stats.fps.avg,
				p95: stats.fps.p95,
				max: stats.fps.max,
			},
			renderTimeMs: {
				avg: stats.render.avg,
				p95: stats.render.p95,
				max: stats.render.max,
			},
			drawCallsAvg: stats.drawCalls.avg,
			batchEfficiencyAvg: stats.batchEfficiency,
		};
	}

	// 触发 JSON 文件下载
	exportJSON(report: ReportData): void {
		const json = JSON.stringify(report, null, 2);
		const ts = report.timestamp.replace(/[:.]/g, '-').slice(0, 19);
		const filename = `benchmark-${report.scene}-${ts}.json`;
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	// 格式化为 Markdown 表格
	formatMarkdown(report: ReportData): string {
		const header =
			'| 场景 | 对象数 | FPS avg | FPS p95 | FPS max | Render avg (ms) | Render p95 (ms) | Render max (ms) | Draw Calls avg | Batch Efficiency |';
		const separator = '|---|---|---|---|---|---|---|---|---|---|';
		const row = `| ${report.scene} | ${report.objectCount} | ${report.fps.avg.toFixed(1)} | ${report.fps.p95.toFixed(1)} | ${report.fps.max.toFixed(1)} | ${report.renderTimeMs.avg.toFixed(2)} | ${report.renderTimeMs.p95.toFixed(2)} | ${report.renderTimeMs.max.toFixed(2)} | ${report.drawCallsAvg.toFixed(1)} | ${report.batchEfficiencyAvg.toFixed(2)} |`;
		return [header, separator, row].join('\n');
	}

	// 写入剪贴板，失败时调用 fallback
	async copyMarkdown(report: ReportData, fallback?: (text: string) => void): Promise<void> {
		const text = this.formatMarkdown(report);
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			fallback?.(text);
		}
	}
}
