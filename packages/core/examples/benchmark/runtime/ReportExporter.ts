import type { BenchmarkEnvironment, ReportData, Stats } from './types.js';

export class ReportExporter {
	// ── Public methods ───────────────────────────────────────────────────────────

	public buildReport(
		sceneId: string,
		objectCount: number,
		stats: Stats,
		environment: BenchmarkEnvironment,
	): ReportData {
		const report: ReportData = {
			timestamp: new Date().toISOString(),
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
			environment,
			scene: sceneId,
			objectCount,
			fps: {
				avg: stats.fps.avg,
				p5: stats.fps.p5,
				p50: stats.fps.p50,
			},
			frameTimeMs: {
				avg: stats.frame.avg,
				p50: stats.frame.p50,
				p95: stats.frame.p95,
				p99: stats.frame.p99,
				max: stats.frame.max,
			},
			renderTimeMs: {
				avg: stats.render.avg,
				p50: stats.render.p50,
				p95: stats.render.p95,
				p99: stats.render.p99,
				max: stats.render.max,
			},
			drawCallsAvg: stats.drawCalls.avg,
			batchEfficiencyAvg: stats.batchEfficiency,
			resources: {
				heapUsedBytes: stats.resources.heapUsedBytes
					? {
						avg: stats.resources.heapUsedBytes.avg,
						p95: stats.resources.heapUsedBytes.p95,
						max: stats.resources.heapUsedBytes.max,
					}
					: undefined,
				textureCount: stats.resources.textureCount,
				framebufferPoolSize: stats.resources.framebufferPoolSize,
				framebufferPoolBytes: stats.resources.framebufferPoolBytes,
			},
		};
		this._assertValidReport(report);
		return report;
	}

	public exportJSON(report: ReportData): void {
		this._assertValidReport(report);
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

	public formatMarkdown(report: ReportData): string {
		this._assertValidReport(report);
		const header =
			'| Engine | Backend | Scene | Objects | FPS avg | FPS p5 | Frame p50 (ms) | Frame p95 (ms) | Frame p99 (ms) | Render p95 (ms) | Draw Calls avg | Batch Efficiency |';
		const separator = '|---|---|---|---|---|---|---|---|---|---|---|---|';
		const row = `| ${report.environment.engine} ${report.environment.engineVersion} | ${report.environment.backend} | ${report.scene} | ${report.objectCount} | ${report.fps.avg.toFixed(1)} | ${report.fps.p5.toFixed(1)} | ${report.frameTimeMs.p50.toFixed(2)} | ${report.frameTimeMs.p95.toFixed(2)} | ${report.frameTimeMs.p99.toFixed(2)} | ${report.renderTimeMs.p95.toFixed(2)} | ${report.drawCallsAvg.toFixed(1)} | ${report.batchEfficiencyAvg.toFixed(2)} |`;
		return [header, separator, row].join('\n');
	}

	public async copyMarkdown(report: ReportData, fallback?: (text: string) => void): Promise<void> {
		const text = this.formatMarkdown(report);
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			fallback?.(text);
		}
	}

	// ── Private methods ──────────────────────────────────────────────────────────

	private _assertValidReport(report: ReportData): void {
		const environment = report.environment;
		if (
			!report.scene ||
			!environment.engine ||
			!environment.engineVersion ||
			!environment.backend ||
			!environment.browser
		) {
			throw new Error('Benchmark report identity fields must not be empty.');
		}
		const values = [
			report.objectCount,
			report.fps.avg,
			report.fps.p5,
			report.fps.p50,
			report.frameTimeMs.avg,
			report.frameTimeMs.p50,
			report.frameTimeMs.p95,
			report.frameTimeMs.p99,
			report.frameTimeMs.max,
			report.renderTimeMs.avg,
			report.renderTimeMs.p50,
			report.renderTimeMs.p95,
			report.renderTimeMs.p99,
			report.renderTimeMs.max,
			report.drawCallsAvg,
			report.batchEfficiencyAvg,
			environment.protocolVersion,
			environment.scenarioVersion,
			environment.seed,
			environment.viewportWidth,
			environment.viewportHeight,
			environment.devicePixelRatio,
			environment.resolution,
			environment.warmupFrames,
			environment.measuredFrames,
			environment.run,
			report.resources.textureCount.current,
			report.resources.textureCount.max,
		];
		if (report.resources.heapUsedBytes) values.push(...Object.values(report.resources.heapUsedBytes));
		if (report.resources.framebufferPoolSize) values.push(...Object.values(report.resources.framebufferPoolSize));
		if (report.resources.framebufferPoolBytes) values.push(...Object.values(report.resources.framebufferPoolBytes));
		if (values.some(value => !Number.isFinite(value) || value < 0)) {
			throw new Error('Benchmark report numeric fields must be finite and non-negative.');
		}
		if (
			environment.protocolVersion < 1 ||
			environment.scenarioVersion < 1 ||
			environment.viewportWidth < 1 ||
			environment.viewportHeight < 1 ||
			environment.devicePixelRatio <= 0 ||
			environment.resolution <= 0 ||
			environment.measuredFrames < 1 ||
			environment.run < 1
		) {
			throw new Error('Benchmark report run metadata is invalid.');
		}
		if (!Number.isFinite(Date.parse(report.timestamp))) {
			throw new Error('Benchmark report timestamp is invalid.');
		}
	}
}
