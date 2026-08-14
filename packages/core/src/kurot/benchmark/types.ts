/**
 * Metrics collected for one rendered frame.
 */
export interface FrameData {
	fps: number;
	drawCalls: number;
	renderTimeMs: number;
	objectCount: number;
}

/**
 * Statistical summary for one metric.
 */
export interface StatSummary {
	current: number;
	avg: number;
	p50: number;
	p95: number;
	max: number;
}

/**
 * Aggregated benchmark statistics.
 */
export interface Stats {
	frameCount: number;
	fps: StatSummary;
	render: StatSummary;
	drawCalls: { current: number; avg: number };
	batchEfficiency: number;
	isLowFps: boolean;
}

/**
 * Serializable benchmark report.
 */
export interface ReportData {
	timestamp: string;
	userAgent: string;
	scene: string;
	objectCount: number;
	fps: { avg: number; p95: number; max: number };
	renderTimeMs: { avg: number; p95: number; max: number };
	drawCallsAvg: number;
	batchEfficiencyAvg: number;
}
