import { describe, expect, it } from 'vitest';
import type { SummaryRow } from './comparison.spec.js';
import { evaluateRegressionGate, type BenchmarkBaseline } from './performance-gate.js';

const metadata = {
	machine: { id: 'reference-mac' },
	browser: { name: 'chromium', version: '140.0' },
};

describe('performance regression gate', () => {
	it('rejects results from another browser build', () => {
		const baseline = makeBaseline(makeRow());
		const result = evaluateRegressionGate(baseline, {
			metadata: { ...metadata, browser: { name: 'chromium', version: '141.0' } },
			rows: [makeRow()],
		});
		expect(result.status).toBe('incompatible');
	});

	it('uses variance and a conservative relative floor for timing metrics', () => {
		const baseline = makeBaseline(makeRow());
		const passing = evaluateRegressionGate(baseline, { metadata, rows: [makeRow({ frameP95: 11.1 })] });
		const failing = evaluateRegressionGate(baseline, { metadata, rows: [makeRow({ frameP95: 13 })] });
		expect(passing.status).toBe('passed');
		expect(failing.regressions[0]?.metric).toBe('frameP95');
	});

	it('does not gate an under-sampled baseline', () => {
		const baseline = makeBaseline(makeRow({ samples: 4 }));
		const result = evaluateRegressionGate(baseline, { metadata, rows: [makeRow({ frameP95: 100 })] });
		expect(result.status).toBe('incompatible');
		expect(result.regressions).toEqual([]);
	});
});

function makeBaseline(row: SummaryRow): BenchmarkBaseline {
	return { metadata, rows: [row] };
}

function makeRow(overrides: Partial<SummaryRow> = {}): SummaryRow {
	return {
		engine: 'Kurot', version: '1.0.15', backend: 'webgl2', scene: 'sprite-batch', objects: 1000,
		samples: 5, fpsP5: 60, fpsP5Min: 59, fpsP5Max: 61, frameP50: 9, frameP95: 10,
		frameP95Min: 9.5, frameP95Max: 10.5, frameP99: 11, renderP95: 5, renderP95Min: 4.8,
		renderP95Max: 5.2, drawCalls: 1, textureCount: 32, framebufferPoolSize: 0, ...overrides,
	};
}
