import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseEvalTask } from '../src/index.js';
import { schedule } from '../src/suite/plan.js';
import { suiteSummary } from '../src/suite/report.js';
import { taskFiles } from '../src/suite/types.js';
import type { SuitePlan, SuiteRun } from '../src/suite/types.js';

const plan = JSON.parse(readFileSync(new URL('../runners/gameplay-suite-v2.json', import.meta.url), 'utf8')) as SuitePlan;

describe('expanded documentation experiment', () => {
	it('preregisters 30 unique jobs with five trials in every task/arm and paired arms', () => {
		const pairs = schedule(plan);
		const jobs = pairs.flatMap(pair => pair.arms.map(arm => ({ id: `${pair.task}-${pair.repeat}-${arm}`, task: pair.task, arm })));
		expect(jobs).toHaveLength(30); expect(new Set(jobs.map(job => job.id)).size).toBe(30);
		for (const task of plan.tasks) {
			for (const arm of ['old', 'new']) { expect(jobs.filter(job => job.task === task && job.arm === arm)).toHaveLength(5); }
		}
		expect(() => schedule({ ...plan, order: Array<string>(10).fill('old') as ('old' | 'new')[] })).toThrow();
		expect(() => schedule({ ...plan, sdk: { '@kurot/core': '^2.5.4' } })).toThrow();
	});

	it('validates all real tasks with the existing v1 schema', () => {
		for (const file of Object.values(taskFiles)) {
			const task = parseEvalTask(JSON.parse(readFileSync(new URL(`../tasks/gameplay/${file}.json`, import.meta.url), 'utf8')));
			expect(task.acceptance.length).toBeGreaterThanOrEqual(4);
		}
	});

	it('distinguishes first/final success and counts every repair token', () => {
		const run: SuiteRun = {
			format: 'kurot-doc-comparison-v1', id: 'tween-1-old', task: 'tween', arm: 'old', startedAt: '2026-10-18T00:00:00Z',
			attempts: [false, true].map((accepted, round) => ({
				round, accepted, checks: [], model: { code: 0, timedOut: false, durationMs: 1 },
				usage: { inputTokens: 100, cachedInputTokens: 40, outputTokens: 20, reasoningOutputTokens: 10, totalTokens: 120 },
			})),
		};
		const row = suiteSummary([run]).find(item => item.task === 'tween' && item.arm === 'old');
		expect(row).toMatchObject({ firstSuccesses: 0, finalSuccesses: 1, repairRounds: [1], meanTotalTokens: 240, meanFirstAttemptTokens: 120, meanUncachedInputTokens: 120 });
	});

	it('keeps infrastructure and missing usage visible instead of reporting zero', () => {
		const run: SuiteRun = {
			format: 'kurot-doc-comparison-v1', id: 'kui-1-new', task: 'kui', arm: 'new', startedAt: '2026-10-18T00:00:00Z',
			attempts: [{ round: 0, accepted: false, checks: [], model: { code: 1, timedOut: false, durationMs: 1 }, usageError: 'No completed turn' }],
		};
		const row = suiteSummary([run]).find(item => item.task === 'kui' && item.arm === 'new');
		expect(row).toMatchObject({ infrastructureFailures: 1, missingUsageAttempts: 1, usageComplete: false });
		expect(row).not.toHaveProperty('meanTotalTokens');
	});
});
