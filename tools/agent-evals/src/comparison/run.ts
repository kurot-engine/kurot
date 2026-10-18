import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { parseEvalTask } from '../eval-validation.js';
import { acceptance } from './acceptance.js';
import { fingerprint, prepareSdk, prepareTrial, sha256, snapshotContexts } from './context.js';
import { parseUsage, summarize } from './metrics.js';
import { runProcess } from './process.js';
import type { Attempt, ComparisonRun, Plan, Usage } from './types.js';

const harness = fileURLToPath(new URL('../..', import.meta.url));
const repo = path.resolve(harness, '../..');
const planText = await readFile(path.join(harness, 'runners/coin-lanes.json'), 'utf8');
const plan = JSON.parse(planText) as Plan;
const taskText = await readFile(path.join(harness, 'tasks/gameplay/coin-lanes.json'), 'utf8');
const task = parseEvalTask(JSON.parse(taskText));
if (plan.format !== 'kurot-doc-comparison-v1') throw new Error('Unsupported comparison format.');
if (plan.order.filter(arm => arm === 'old').length !== plan.trialsPerArm ||
	plan.order.filter(arm => arm === 'new').length !== plan.trialsPerArm) throw new Error('Unbalanced plan.');
const codexVersion = execFileSync('codex', ['--version'], { encoding: 'utf8' }).trim();
if (codexVersion !== plan.codexVersion) throw new Error(`Expected ${plan.codexVersion}, found ${codexVersion}.`);
const auth = spawnSync('codex', ['login', 'status'], { encoding: 'utf8' });
if (auth.status !== 0 || !`${auth.stdout}${auth.stderr}`.includes('Logged in using ChatGPT')) {
	throw new Error('This runner requires an existing ChatGPT CLI login. API-key provisioning is outside this experiment.');
}
const authResult = 'Existing ChatGPT CLI login';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.resolve(process.argv[2] ?? path.join(os.tmpdir(), `kurot-doc-eval-${stamp}`));
await mkdir(output, { recursive: false });
const report = path.join(harness, 'reports', path.basename(output));
await mkdir(report, { recursive: false });
await writeFile(path.join(report, 'artifacts.txt'), `${output}\n`);
const contexts = await snapshotContexts(repo, output, plan);
const sdk = await prepareSdk(repo, output, plan);
const modelArgs = [
	'exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'workspace-write',
	'--model', plan.model, '-c', `model_reasoning_effort="${plan.reasoningEffort}"`,
	'-c', 'approval_policy="never"', '-c', 'web_search="disabled"',
	'--disable', 'apps', '--disable', 'multi_agent', '--disable', 'memories', '--json', '-',
];
const metadata = {
	format: plan.format, startedAt: new Date().toISOString(), plan, contexts, sdk,
	planSha256: sha256(planText), taskSha256: sha256(taskText), nodeVersion: process.version,
	platform: `${os.platform()} ${os.release()} ${os.arch()}`, codexVersion, authStatus: authResult,
	modelArgs, harnessSource: await fingerprint(path.join(harness, 'src')),
	limitations: [
		'Model identifier is fixed; the provider does not expose an immutable weights snapshot or a sampling seed here.',
		'Workspace copies isolate supplied context, but the CLI read sandbox is not a separate host/container.',
		'First success means first external handoff; self-checks within one model turn are included in its tokens.',
		'Repair rounds use fresh CLI sessions with the same task, current files and external failure feedback.',
		'Visual quality and API misuse taxonomy are not scored; no fabricated EvalRun v1 values are emitted.',
	],
};
await writeFile(path.join(output, 'experiment.json'), JSON.stringify(metadata, undefined, 2));
await writeFile(path.join(output, 'task.json'), taskText);
await writeFile(path.join(output, 'plan.json'), planText);
const results: ComparisonRun[] = [];

for (let i = 0; i < plan.order.length; i++) {
	const id = `trial-${String(i + 1).padStart(2, '0')}`;
	const arm = plan.order[i];
	const directory = await prepareTrial(output, arm, id);
	const protectedFiles = await fingerprint(directory);
	const startedAt = new Date().toISOString();
	const attempts: Attempt[] = [];
	for (let round = 0; round <= plan.maxRepairRounds; round++) {
		const artifacts = path.join(output, 'artifacts', id, `round-${round}`);
		await mkdir(artifacts, { recursive: true });
		const previous = attempts.at(-1);
		const feedback = previous ? `\n\nExternal acceptance failed. Fix the implementation, preserving the original task.\n${JSON.stringify(previous.checks.filter(check => !check.passed), undefined, 2)}` : '';
		const prompt = task.prompt + '\n\nDocumentation/reference copies are read-only context. Stay in this project; do not inspect other directories, previous evaluation runs, host configuration or credentials.\n' + feedback;
		await writeFile(path.join(artifacts, 'prompt.txt'), prompt);
		process.stdout.write(`${id} ${arm} round ${round}: model start\n`);
		const model = await runProcess('codex', modelArgs, directory, path.join(artifacts, 'model'), plan.modelTimeoutMs, prompt);
		let usage: Usage | undefined;
		let usageError: string | undefined;
		try {
			usage = parseUsage(await readFile(path.join(artifacts, 'model.stdout'), 'utf8'));
		} catch (error) {
			usageError = String(error);
		}
		const sdkUnchanged = sha256(JSON.stringify(await fingerprint(path.join(output, 'sdk/node_modules'), true))) === sdk.filesSha256;
		const checks = sdkUnchanged ? await acceptance(directory, artifacts, protectedFiles) : [
			{ id: 'sdk-integrity', passed: false, detail: 'Frozen SDK changed; invalidate this experiment.' },
		];
		const accepted = model.code === 0 && !model.timedOut && usage !== undefined && checks.every(check => check.passed);
		attempts.push({ round, model, usage, usageError, checks, accepted });
		await cp(path.join(directory, 'src'), path.join(artifacts, 'submission/src'), { recursive: true });
		await cp(path.join(directory, 'template'), path.join(artifacts, 'submission/template'), { recursive: true });
		await writeFile(path.join(artifacts, 'result.json'), JSON.stringify(attempts.at(-1), undefined, 2));
		process.stdout.write(`${id} ${arm} round ${round}: accepted=${accepted}, tokens=${usage?.totalTokens ?? 'unavailable'}, checks=${checks.filter(check => !check.passed).map(check => check.id).join(',') || 'all passed'}\n`);
		if (accepted) break;
		// Tool/auth/usage failures are infrastructure failures, not model repair opportunities.
		if (model.code !== 0 || model.timedOut || usage === undefined || checks.some(check => ['browser-infrastructure', 'sdk-integrity'].includes(check.id))) break;
	}
	const result: ComparisonRun = { format: plan.format, id, arm, startedAt, attempts };
	results.push(result);
	await writeFile(path.join(output, `${id}.json`), JSON.stringify(result, undefined, 2));
	await writeFile(path.join(report, 'comparison.json'), JSON.stringify({ experiment: metadata, results, summary: summarize(results) }, undefined, 2));
}
await cp(path.join(output, 'contexts.json'), path.join(report, 'contexts.json'));
process.stdout.write(`${JSON.stringify(summarize(results), undefined, 2)}\nEvidence: ${output}\nReport: ${report}\n`);
