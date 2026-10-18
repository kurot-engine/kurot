import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseEvalTask } from '../eval-validation.js';
import { fingerprint, sha256, snapshotContexts } from '../comparison/context.js';
import { prepareSuiteSdk } from './sdk.js';
import { executeJob, modelArguments } from './jobs.js';
import { suiteSummary, writeReport } from './report.js';
import { schedule } from './plan.js';
import { taskFiles } from './types.js';
import type { Check } from '../comparison/types.js';
import type { SuitePlan, SuiteRun, TaskKind } from './types.js';

const harness = fileURLToPath(new URL('../..', import.meta.url));
const repo = path.resolve(harness, '../..');
const planText = await readFile(path.join(harness, 'runners/gameplay-suite-v2.json'), 'utf8');
const plan = JSON.parse(planText) as SuitePlan;
const pairs = schedule(plan);
const calibration = path.resolve(process.argv[3]);
const controls = JSON.parse(await readFile(path.join(calibration, 'calibration.json'), 'utf8')) as {
	task: TaskKind; variant: string; checks: Check[];
}[];
for (const task of plan.tasks) {
	const positive = controls.find(control => control.task === task && control.variant === 'positive');
	const negative = controls.find(control => control.task === task && control.variant === 'negative');
	if (!positive || positive.checks.length < 7 || positive.checks.some(check => !check.passed) ||
		!negative?.checks.some(check => !check.passed) || !negative.checks.find(check => check.id === 'typecheck')?.passed) {
		throw new Error(`A complete positive/negative calibration is required for ${task}.`);
	}
}
const version = execFileSync('codex', ['--version'], { encoding: 'utf8' }).trim();
if (version !== plan.codexVersion) throw new Error('Codex version changed.');
const auth = spawnSync('codex', ['login', 'status'], { encoding: 'utf8' });
if (auth.status !== 0 || !`${auth.stdout}${auth.stderr}`.includes('Logged in using ChatGPT')) throw new Error('Existing ChatGPT CLI login required.');
const output = path.resolve(process.argv[2]);
await mkdir(output);
const report = path.join(harness, 'reports', path.basename(output)); await mkdir(report);
await writeFile(path.join(report, 'artifacts.txt'), `${output}\n`);
const contexts = await snapshotContexts(repo, output, plan) as { contextManifestSha256: string };
if (contexts.contextManifestSha256 !== plan.contextManifestSha256) throw new Error('Documentation treatment differs from frozen step-3 snapshots.');
const sdk = await prepareSuiteSdk(repo, output, plan);
const reuse = process.argv[4] ? path.resolve(process.argv[4]) : undefined;
if (reuse) {
	const original = JSON.parse(await readFile(path.join(reuse, 'experiment.json'), 'utf8')) as {
		sdk: { filesSha256: string }; contexts: { contextManifestSha256: string }; plan: SuitePlan;
	};
	if (original.sdk.filesSha256 !== sdk.filesSha256 || original.contexts.contextManifestSha256 !== contexts.contextManifestSha256 ||
		JSON.stringify(modelArguments(original.plan)) !== JSON.stringify(modelArguments(plan))) throw new Error('Rescoring must preserve SDK, documentation and model arguments.');
}
const definitions = new Map<TaskKind, ReturnType<typeof parseEvalTask>>();
const taskHashes: Record<string, string> = {};
await mkdir(path.join(output, 'tasks'));
for (const task of plan.tasks) {
	const body = await readFile(path.join(harness, 'tasks/gameplay', `${taskFiles[task]}.json`), 'utf8');
	definitions.set(task, parseEvalTask(JSON.parse(body))); taskHashes[task] = sha256(body);
	await writeFile(path.join(output, 'tasks', `${task}.json`), body);
}
await cp(path.join(harness, 'src'), path.join(output, 'harness/src'), { recursive: true });
await cp(path.join(harness, 'test'), path.join(output, 'harness/test'), { recursive: true });
await cp(path.join(harness, 'pnpm-lock.yaml'), path.join(output, 'harness/pnpm-lock.yaml'));
await cp(path.join(harness, 'package.json'), path.join(output, 'harness/package.json'));
await writeFile(path.join(output, 'plan.json'), planText);
const experiment = {
	format: plan.experiment, startedAt: new Date().toISOString(), plan, contexts, sdk,
	planSha256: sha256(planText), taskHashes, nodeVersion: process.version, codexVersion: version,
	modelArguments: modelArguments(plan), harnessSource: await fingerprint(path.join(harness, 'src')),
	policy: { modelConcurrency: 2, browserConcurrency: 1, firstSuccess: 'first external handoff', totalTokens: 'input + output; cached/reasoning are subsets' },
	pairs,
	calibrationSha256: sha256(await readFile(path.join(calibration, 'calibration.json'))),
	...(reuse ? { correction: { originalEvidence: reuse, reason: 'Resource oracle required active-play restart although the task only required restart after end.', reused: ['resources-1-old', 'resources-1-new'], invalidFeedbackRepairsExcluded: true } } : {}),
};
await mkdir(path.join(output, 'calibration'));
await cp(path.join(calibration, 'calibration.json'), path.join(output, 'calibration/results.json'));
await cp(path.join(harness, 'test/fixtures/suite'), path.join(output, 'calibration/fixtures'), { recursive: true });
for (const task of plan.tasks) {
	for (const variant of ['positive', 'negative']) {
		await cp(path.join(calibration, `${variant}-${task}`), path.join(output, 'calibration', `${variant}-${task}`), { recursive: true });
	}
}
await writeFile(path.join(output, 'experiment.json'), JSON.stringify(experiment, undefined, 2));
const results: SuiteRun[] = [];

for (const { repeat, task, arms } of pairs) {
		const definition = definitions.get(task);
		if (!definition) throw new Error(`Missing task ${task}.`);
		const jobs = arms.map((arm, index) => executeJob(output, `${task}-${repeat}-${arm}`, arm, task, definition, plan, sdk.filesSha256, task === 'resources' && repeat === 1 ? reuse : undefined)
			.then(result => ({ result, index })));
		const finished = await Promise.all(jobs);
		results.push(...finished.sort((a, b) => a.index - b.index).map(item => item.result));
		await writeFile(path.join(report, 'comparison.json'), JSON.stringify({ experiment, results, summary: suiteSummary(results) }, undefined, 2));
		await writeReport(report, results);
}
process.stdout.write('All planned samples completed; archiving evidence.\n');
await cp(output, path.join(report, 'evidence'), { recursive: true, verbatimSymlinks: true });
await writeFile(path.join(report, 'artifacts.txt'), `${path.join(report, 'evidence')}\n`);
await writeReport(report, results);
process.stdout.write(`${JSON.stringify(suiteSummary(results), undefined, 2)}\nReport: ${report}\n`);
