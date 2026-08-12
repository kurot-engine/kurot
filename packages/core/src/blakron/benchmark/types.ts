/** 单帧采集数据 */
export interface FrameData {
	fps: number;
	drawCalls: number;
	renderTimeMs: number;
	objectCount: number;
}

/** 单项指标的统计摘要 */
export interface StatSummary {
	current: number;
	avg: number;
	p50: number;
	p95: number;
	max: number;
}

/** 完整统计结果 */
export interface Stats {
	frameCount: number;
	fps: StatSummary;
	render: StatSummary;
	drawCalls: { current: number; avg: number };
	batchEfficiency: number;
	isLowFps: boolean;
}

/** 导出报告格式 */
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
