import { cp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fingerprint, sha256 } from '../comparison/context.js';
import type { SuitePlan } from './types.js';

export async function prepareSuiteSdk(repo: string, output: string, plan: SuitePlan): Promise<{
	filesSha256: string; versions: Readonly<Record<string, string>>; browserVersion: string;
}> {
	const sdk = path.join(output, 'sdk');
	await cp(path.join(repo, 'examples/game/node_modules'), path.join(sdk, 'node_modules'), { recursive: true, verbatimSymlinks: true });
	await cp(path.join(repo, 'examples/star-catcher/node_modules'), path.join(sdk, 'tooling/node_modules'), { recursive: true, verbatimSymlinks: true });
	for (const name of ['tsx', 'typescript']) {
		await symlink(`../tooling/node_modules/${name}`, path.join(sdk, 'node_modules', name), 'dir');
	}
	for (const [name, version] of Object.entries(plan.sdk)) {
		const pkg = JSON.parse(await readFile(path.join(sdk, 'node_modules', name, 'package.json'), 'utf8')) as { version: string };
		if (pkg.version !== version) throw new Error(`${name}: expected ${version}, installed ${pkg.version}.`);
	}
	const browser = JSON.parse(await readFile(path.join(sdk, 'tooling/node_modules/@playwright/test/package.json'), 'utf8')) as { version: string };
	if (browser.version !== '1.62.1') throw new Error('Expected existing Playwright 1.62.1.');
	await mkdir(path.join(sdk, 'locks'));
	for (const project of ['game', 'star-catcher']) {
		await cp(path.join(repo, 'examples', project, 'pnpm-lock.yaml'), path.join(sdk, 'locks', `${project}.yaml`));
		await cp(path.join(repo, 'examples', project, 'package.json'), path.join(sdk, 'locks', `${project}.package.json`));
	}
	const hashes = await fingerprint(sdk, true);
	await writeFile(path.join(output, 'sdk-files.json'), JSON.stringify(hashes, undefined, 2));
	return { filesSha256: sha256(JSON.stringify(hashes)), versions: plan.sdk, browserVersion: browser.version };
}
