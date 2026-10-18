import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint, snapshotContexts } from '../comparison/context.js';
import { prepareSuiteSdk } from './sdk.js';
import { prepareTaskTrial } from './fixture.js';
import { suiteAcceptance } from './acceptance.js';
import type { SuitePlan } from './types.js';

const harness = fileURLToPath(new URL('../..', import.meta.url));
const repo = path.resolve(harness, '../..');
const output = path.resolve(process.argv[2]);
const plan = JSON.parse(await readFile(path.join(harness, 'runners/gameplay-suite-v2.json'), 'utf8')) as SuitePlan;
await mkdir(output);
const contexts = await snapshotContexts(repo, output, plan) as { contextManifestSha256: string };
if (contexts.contextManifestSha256 !== plan.contextManifestSha256) throw new Error('Documentation treatment differs from step 3.');
await prepareSuiteSdk(repo, output, plan);
const results: object[] = [];

for (const task of plan.tasks) {
	const directory = await prepareTaskTrial(output, 'new', `control-${task}`, task);
	const expected = await fingerprint(directory);
	const fixture = path.join(harness, 'test/fixtures/suite');
	await cp(path.join(fixture, 'common.ts'), path.join(directory, 'src/common.ts'));
	await cp(path.join(fixture, `${task}.ts`), path.join(directory, 'src/Main.ts'));
	if (task === 'kui') {
		for (const name of ['QuizSkin.kui.xml', 'ButtonSkin.kui.xml']) {
			await cp(path.join(fixture, name), path.join(directory, 'resource/ui', name));
		}
	}
	const positive = path.join(output, `positive-${task}`);
	await mkdir(positive);
	const checks = await suiteAcceptance(directory, positive, expected, task);
	results.push({ task, variant: 'positive', checks });
	await writeFile(path.join(output, 'calibration.json'), JSON.stringify(results, undefined, 2));
	process.stdout.write(`${task} positive: ${JSON.stringify(checks.filter(check => !check.passed))}\n`);
	if (!checks.every(check => check.passed)) throw new Error(`Positive ${task} did not pass; retain ${output} and repair the oracle/fixture.`);
	const source = await readFile(path.join(directory, 'src/Main.ts'), 'utf8');
	const broken = task === 'resources' ? source.replace("'resource/default.res.json', 'resource/'", "'resource/default.res.json', ''") :
		task === 'tween' ? source.replaceAll('Tween.removeTweens(runner)', 'Tween.pauseTweens(runner)') : source.replace('this._score += 10', 'this._score += 20');
	if (source === broken) throw new Error('Negative mutation did not apply.');
	await writeFile(path.join(directory, 'src/Main.ts'), broken);
	const negative = path.join(output, `negative-${task}`); await mkdir(negative);
	const failures = await suiteAcceptance(directory, negative, expected, task);
	results.push({ task, variant: 'negative', checks: failures });
	await writeFile(path.join(output, 'calibration.json'), JSON.stringify(results, undefined, 2));
	if (!failures.some(check => !check.passed) || !failures.find(check => check.id === 'typecheck')?.passed) {
		throw new Error(`Negative ${task} was not behaviorally rejected.`);
	}
	process.stdout.write(`${task} negative rejected: ${failures.filter(check => !check.passed).map(check => check.id).join(',')}\n`);
}
