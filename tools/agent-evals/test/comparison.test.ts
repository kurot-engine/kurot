import { describe, expect, it } from 'vitest';
import { parseUsage, summarize } from '../src/comparison/metrics.js';
import { parseEvalTask } from '../src/index.js';
import { readFileSync } from 'node:fs';
import type { ComparisonRun } from '../src/comparison/types.js';

describe('documentation comparison measurements', () => {
	it('counts cached/reasoning subsets once, preserving raw breakdown', () => {
		const usage = parseUsage(JSON.stringify({ type: 'turn.completed', usage: {
			input_tokens: 100, cached_input_tokens: 80, output_tokens: 40, reasoning_output_tokens: 30,
		} }));
		expect(usage).toEqual({ inputTokens: 100, cachedInputTokens: 80, outputTokens: 40, reasoningOutputTokens: 30, totalTokens: 140 });
	});

	it('never substitutes zero for missing, failed, duplicate or invalid usage', () => {
		for (const jsonl of [
			'{"type":"turn.failed"}',
			'{"type":"turn.completed","usage":{}}',
			'{"type":"turn.completed"}\n{"type":"turn.completed"}',
			'{"type":"turn.completed","usage":{"input_tokens":-1}}',
		]) expect(() => parseUsage(jsonl)).toThrow();
	});

	it('distinguishes first delivery, repaired success and unavailable token totals', () => {
		const run: ComparisonRun = {
			format: 'kurot-doc-comparison-v1', id: 'trial-01', arm: 'old', startedAt: '2026-10-18T00:00:00Z',
			attempts: [false, true].map((accepted, round) => ({
				round, accepted, model: { code: 0, timedOut: false, durationMs: 1 }, checks: [],
			})),
		};
		expect(summarize([run])[0]).toEqual({ arm: 'old', trials: 1, firstSuccesses: 0, finalSuccesses: 1, repairRounds: [1], usageComplete: false });
	});

	it('validates the actual executable task against the existing v1 contract', () => {
		const task = parseEvalTask(JSON.parse(readFileSync(new URL('../tasks/gameplay/coin-lanes.json', import.meta.url), 'utf8')));
		expect(task.acceptance.map(check => check.id)).toContain('cleanup-mobile');
	});

	it('does not produce token means for an arm that has not run yet', () => {
		for (const summary of summarize([])) {
			expect(summary).toMatchObject({ trials: 0, usageComplete: false });
			expect(summary).not.toHaveProperty('meanTokensPerTrial');
		}
	});
});
