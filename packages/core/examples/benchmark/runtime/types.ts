/**
 * Metrics collected for one rendered frame.
 */
export interface FrameData {
	fps: number;
	drawCalls: number;
	frameTimeMs: number;
	renderTimeMs: number;
	objectCount: number;
}

/**
 * Statistical summary for one metric.
 */
export interface StatSummary {
	current: number;
	avg: number;
	p5: number;
	p50: number;
	p95: number;
	p99: number;
	max: number;
}

export interface BenchmarkEnvironment {
	protocolVersion: number;
	engine: string;
	engineVersion: string;
	backend: string;
	browser: string;
	runMode: 'headless' | 'headed';
	scenarioVersion: number;
	seed: number;
	viewportWidth: number;
	viewportHeight: number;
	devicePixelRatio: number;
	resolution: number;
	antialias: boolean;
	warmupFrames: number;
	measuredFrames: number;
	run: number;
}

/**
 * Aggregated benchmark statistics.
 */
export interface Stats {
	frameCount: number;
	fps: StatSummary;
	frame: StatSummary;
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
	environment: BenchmarkEnvironment;
	scene: string;
	objectCount: number;
	fps: { avg: number; p5: number; p50: number };
	frameTimeMs: { avg: number; p50: number; p95: number; p99: number; max: number };
	renderTimeMs: { avg: number; p50: number; p95: number; p99: number; max: number };
	drawCallsAvg: number;
	batchEfficiencyAvg: number;
}
