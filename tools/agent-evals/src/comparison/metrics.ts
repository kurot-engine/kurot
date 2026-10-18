import type { ComparisonRun, Usage } from './types.js';

function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.');
	return value as Record<string, unknown>;
}

function count(value: unknown): number {
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
		throw new Error('Missing or invalid token count.');
	}
	return value;
}

/**
 * Cached input is a subset of input; reasoning is a subset of output.
 */
export function parseUsage(jsonl: string): Usage {
	const completed = jsonl.trim().split('\n').filter(Boolean).map(line => record(JSON.parse(line)))
		.filter(event => event.type === 'turn.completed');
	if (completed.length !== 1) throw new Error(`Expected one completed turn, found ${completed.length}.`);
	const usage = record(completed[0].usage);
	const inputTokens = count(usage.input_tokens);
	const cachedInputTokens = count(usage.cached_input_tokens);
	const outputTokens = count(usage.output_tokens);
	const reasoningOutputTokens = count(usage.reasoning_output_tokens);
	if (cachedInputTokens > inputTokens || reasoningOutputTokens > outputTokens) {
		throw new Error('Invalid token subset counts.');
	}
	return { inputTokens, cachedInputTokens, outputTokens, reasoningOutputTokens, totalTokens: inputTokens + outputTokens };
}

export function summarize(runs: readonly ComparisonRun[]): object[] {
	return (['old', 'new'] as const).map(arm => {
		const group = runs.filter(run => run.arm === arm);
		const attempts = group.flatMap(run => run.attempts);
		const usageComplete = group.length > 0 && attempts.every(attempt => attempt.usage !== undefined);
		const total = attempts.reduce((sum, attempt) => sum + (attempt.usage?.totalTokens ?? 0), 0);
		return {
			arm, trials: group.length,
			firstSuccesses: group.filter(run => run.attempts[0]?.accepted).length,
			finalSuccesses: group.filter(run => run.attempts.at(-1)?.accepted).length,
			repairRounds: group.map(run => Math.max(0, run.attempts.length - 1)),
			usageComplete,
			...(usageComplete ? { totalTokens: total, meanTokensPerTrial: total / group.length } : {}),
		};
	});
}
