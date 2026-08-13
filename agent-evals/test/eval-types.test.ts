import { describe, expect, it } from 'vitest';
import { EvalValidationError, parseEvalRun, parseEvalTask } from '../src/index.js';
import type { EvalRun, EvalTask } from '../src/index.js';

describe('Agent Eval contracts', () => {
	it('keeps task definitions JSON serializable', () => {
		const task: EvalTask = {
			schemaVersion: '1',
			id: 'basic.display-text',
			category: 'basic',
			title: 'Display text',
			prompt: 'Create a Kurot game that displays Hello Kurot.',
			acceptance: [
				{ id: 'build', kind: 'command', description: 'The strict build succeeds.' },
				{ id: 'text', kind: 'behavior', description: 'The text is visible in the game.' },
			],
		};

		expect(JSON.parse(JSON.stringify(task))).toEqual(task);
		expect(parseEvalTask(task)).toEqual(task);
	});

	it('records all roadmap baseline metrics', () => {
		const run: EvalRun = {
			schemaVersion: '1',
			taskId: 'basic.display-text',
			model: 'example-model',
			kurotRevision: 'example-revision',
			startedAt: '2026-08-13T00:00:00.000Z',
			metrics: {
				firstBuildSucceeded: true,
				firstRunSucceeded: true,
				behaviorAccepted: true,
				visualAccepted: false,
				repairRounds: 0,
				tokenCount: 1000,
				durationMs: 5000,
				inventedApiCount: 0,
				internalApiUseCount: 0,
				foreignConventionCount: 0,
			},
		};

		expect(Object.keys(run.metrics)).toHaveLength(10);
		expect(parseEvalRun(run)).toEqual(run);
	});

	it('returns structured issues for invalid task definitions', () => {
		try {
			parseEvalTask({ schemaVersion: '2', id: 'Invalid ID' });
			throw new Error('Expected task validation to fail');
		} catch (error) {
			expect(error).toBeInstanceOf(EvalValidationError);
			if (!(error instanceof EvalValidationError)) return;
			expect(error.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ path: '/schemaVersion', keyword: 'const' }),
					expect.objectContaining({ path: '/', keyword: 'required' }),
				]),
			);
		}
	});

	it('rejects negative metrics and invalid timestamps', () => {
		const invalid = {
			schemaVersion: '1',
			taskId: 'basic.display-text',
			model: 'example-model',
			kurotRevision: 'example-revision',
			startedAt: 'not-a-date',
			metrics: {
				firstBuildSucceeded: true,
				firstRunSucceeded: true,
				behaviorAccepted: true,
				visualAccepted: false,
				repairRounds: -1,
				tokenCount: 0,
				durationMs: 0,
				inventedApiCount: 0,
				internalApiUseCount: 0,
				foreignConventionCount: 0,
			},
		};

		expect(() => parseEvalRun(invalid)).toThrow(EvalValidationError);
	});
});
