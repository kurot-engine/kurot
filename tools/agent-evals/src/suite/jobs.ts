import { cp, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { EvalTask } from '../eval-types.js';
import { fingerprint, sha256 } from '../comparison/context.js';
import { parseUsage } from '../comparison/metrics.js';
import { runProcess } from '../comparison/process.js';
import type { Attempt, Usage } from '../comparison/types.js';
import { prepareTaskTrial } from './fixture.js';
import { suiteAcceptance } from './acceptance.js';
import type { SuitePlan, SuiteRun, TaskKind } from './types.js';

export const modelArguments = (plan: SuitePlan): string[] => [
	'exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'workspace-write',
	'--model', plan.model, '-c', `model_reasoning_effort="${plan.reasoningEffort}"`,
	'-c', 'approval_policy="never"', '-c', 'web_search="disabled"',
	'--disable', 'apps', '--disable', 'multi_agent', '--disable', 'memories', '--json', '-',
];

let oracleTail = Promise.resolve();

async function oracle(directory: string, artifacts: string, expected: Record<string, string>, task: TaskKind): ReturnType<typeof suiteAcceptance> {
	const previous = oracleTail;
	let release: (() => void) | undefined;
	oracleTail = new Promise<void>(resolve => { release = resolve; });
	await previous;
	try { return await suiteAcceptance(directory, artifacts, expected, task); }
	finally { release?.(); }
}

export function infrastructureFailure(attempt: Attempt): boolean {
	return attempt.model.code !== 0 || attempt.model.timedOut || attempt.usage === undefined ||
		attempt.checks.some(check => ['browser-infrastructure', 'sdk-integrity'].includes(check.id));
}

export async function executeJob(
	output: string, id: string, arm: 'old' | 'new', task: TaskKind, definition: EvalTask,
	plan: SuitePlan, sdkHash: string,
	reuse?: string,
): Promise<SuiteRun> {
	const directory = await prepareTaskTrial(output, arm, id, task);
	const expected = await fingerprint(directory);
	const startedAt = new Date().toISOString();
	const attempts: Attempt[] = [];
	for (let round = 0; round <= plan.maxRepairRounds; round++) {
		const artifacts = path.join(output, 'artifacts', id, `round-${round}`);
		await mkdir(artifacts, { recursive: true });
		const last = attempts.at(-1);
		const feedback = last ? `\nExternal acceptance failed. Repair only the implementation.\n${JSON.stringify(last.checks.filter(check => !check.passed), undefined, 2)}` : '';
		const prompt = definition.prompt + '\nDocumentation/references are read-only. Stay in this project; do not inspect sibling trials, host configuration, credentials or other host directories.\n' + feedback;
		await writeFile(path.join(artifacts, 'prompt.txt'), prompt);
		process.stdout.write(`${id} ${task} ${arm} round ${round}: ${reuse && round === 0 ? 'rescore frozen first handoff' : 'start'}\n`);
		let model: Attempt['model'];
		const reusedModelArtifact = reuse && round === 0 ? path.join(reuse, 'artifacts', id, 'round-0') : undefined;
		if (reusedModelArtifact) {
			if (await readFile(path.join(reusedModelArtifact, 'prompt.txt'), 'utf8') !== prompt) throw new Error('Reused first-handoff prompt differs.');
			const prior = JSON.parse(await readFile(path.join(reusedModelArtifact, 'result.json'), 'utf8')) as Attempt;
			if (prior.model.code !== 0 || prior.model.timedOut || !prior.usage) throw new Error('Only a completed first handoff can be rescored.');
			for (const folder of ['src', 'template']) {
				await cp(path.join(reusedModelArtifact, 'submission', folder), path.join(directory, folder), { recursive: true });
			}
			for (const stream of ['stdout', 'stderr']) {
				await cp(path.join(reusedModelArtifact, `model.${stream}`), path.join(artifacts, `model.${stream}`));
			}
			model = prior.model;
		} else {
			model = await runProcess('codex', modelArguments(plan), directory, path.join(artifacts, 'model'), plan.modelTimeoutMs, prompt);
		}
		let usage: Usage | undefined;
		let usageError: string | undefined;
		try { usage = parseUsage(await readFile(path.join(artifacts, 'model.stdout'), 'utf8')); }
		catch (error) { usageError = String(error); }
		const sdkIntact = sha256(JSON.stringify(await fingerprint(path.join(output, 'sdk'), true))) === sdkHash &&
			await realpath(path.join(directory, 'node_modules')) === await realpath(path.join(output, 'sdk/node_modules'));
		const checks = sdkIntact ? await oracle(directory, artifacts, expected, task) : [
			{ id: 'sdk-integrity', passed: false, detail: 'Frozen SDK bytes or project SDK link changed.' },
		];
		if (sha256(JSON.stringify(await fingerprint(path.join(output, 'sdk'), true))) !== sdkHash) {
			checks.push({ id: 'sdk-integrity', passed: false, detail: 'SDK changed during acceptance.' });
		}
		const accepted = model.code === 0 && !model.timedOut && usage !== undefined && checks.every(check => check.passed);
		const attempt: Attempt = { round, model, usage, usageError, checks, accepted, ...(reusedModelArtifact ? { reusedModelArtifact } : {}) };
		attempts.push(attempt);
		for (const folder of ['src', 'template', ...(task === 'tween' ? [] : ['resource'])]) {
			await cp(path.join(directory, folder), path.join(artifacts, 'submission', folder), { recursive: true });
		}
		await writeFile(path.join(artifacts, 'result.json'), JSON.stringify(attempt, undefined, 2));
		process.stdout.write(`${id} ${task} ${arm} round ${round}: accepted=${accepted} tokens=${usage?.totalTokens ?? 'unavailable'} failed=${checks.filter(check => !check.passed).map(check => check.id).join(',')}\n`);
		if (accepted || infrastructureFailure(attempt)) break;
	}
	const result: SuiteRun = { format: 'kurot-doc-comparison-v1', id, task, arm, startedAt, attempts };
	await writeFile(path.join(output, `${id}.json`), JSON.stringify(result, undefined, 2));
	return result;
}
