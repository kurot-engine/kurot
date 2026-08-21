import type { SummaryRow } from './comparison.spec.js';

interface GateMetadata {
	machine: { id: string };
	browser: { name: string; version: string };
}

export interface BenchmarkBaseline {
	metadata: GateMetadata;
	rows: SummaryRow[];
}

export interface GateRegression {
	key: string;
	metric: string;
	message: string;
}

export interface GateResult {
	status: 'passed' | 'failed' | 'incompatible';
	reason?: string;
	regressions: GateRegression[];
}

/** Compares only measurements made on the same named machine and browser build. */
export function evaluateRegressionGate(
	baseline: BenchmarkBaseline,
	current: { metadata: GateMetadata; rows: SummaryRow[] },
): GateResult {
	if (baseline.metadata.machine.id !== current.metadata.machine.id) {
		return { status: 'incompatible', reason: 'machine id differs', regressions: [] };
	}
	if (
		baseline.metadata.browser.name !== current.metadata.browser.name ||
		baseline.metadata.browser.version !== current.metadata.browser.version
	) {
		return { status: 'incompatible', reason: 'browser name or version differs', regressions: [] };
	}
	const regressions: GateRegression[] = [];
	let evaluatedRows = 0;
	for (const row of current.rows.filter(item => item.engine === 'Kurot')) {
		const key = rowKey(row);
		const reference = baseline.rows.find(item => rowKey(item) === key);
		if (!reference || reference.samples < 5 || row.samples < 3) continue;
		evaluatedRows++;
		checkTiming(regressions, key, 'frameP95', reference.frameP95, reference.frameP95Min, reference.frameP95Max, row.frameP95);
		checkTiming(regressions, key, 'renderP95', reference.renderP95, reference.renderP95Min, reference.renderP95Max, row.renderP95);
		checkLimit(regressions, key, 'drawCalls', reference.drawCalls, row.drawCalls, 0);
		checkLimit(regressions, key, 'textureCount', reference.textureCount, row.textureCount, 0);
		if (reference.heapP95 !== undefined && row.heapP95 !== undefined) {
			checkLimit(regressions, key, 'heapP95', reference.heapP95, row.heapP95, 0.2);
		}
		if (reference.framebufferPoolSize !== undefined && row.framebufferPoolSize !== undefined) {
			checkLimit(regressions, key, 'framebufferPoolSize', reference.framebufferPoolSize, row.framebufferPoolSize, 0);
		}
	}
	if (evaluatedRows === 0) {
		return { status: 'incompatible', reason: 'no matching rows have enough samples', regressions: [] };
	}
	return { status: regressions.length > 0 ? 'failed' : 'passed', regressions };
}

function checkTiming(
	items: GateRegression[], key: string, metric: string, baseline: number, min: number, max: number, current: number,
): void {
	const limit = baseline + Math.max(baseline * 0.12, (max - min) * 2);
	if (current > limit) addRegression(items, key, metric, baseline, current, limit);
}

function checkLimit(
	items: GateRegression[], key: string, metric: string, baseline: number, current: number, tolerance: number,
): void {
	const limit = baseline * (1 + tolerance);
	if (current > limit) addRegression(items, key, metric, baseline, current, limit);
}

function addRegression(
	items: GateRegression[], key: string, metric: string, baseline: number, current: number, limit: number,
): void {
	items.push({ key, metric, message: `${key} ${metric}: ${current.toFixed(2)} exceeds ${limit.toFixed(2)} (baseline ${baseline.toFixed(2)})` });
}

function rowKey(row: SummaryRow): string {
	return [row.engine, row.backend, row.scene, row.objects].join('|');
}
