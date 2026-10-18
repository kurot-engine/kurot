import { mkdtemp, mkdir, cp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { prepareTrial, fingerprint } from '../src/comparison/context.js';
import { acceptance } from '../src/comparison/acceptance.js';

it('accepts a real control game and rejects a broken scoring implementation', async () => {
	const repo = fileURLToPath(new URL('../../..', import.meta.url));
	const output = await mkdtemp(path.join(tmpdir(), 'kurot-oracle-control-'));
	try {
		await mkdir(path.join(output, 'contexts/new'), { recursive: true });
		await writeFile(path.join(output, 'contexts/new/AGENTS.md'), 'Oracle control fixture.\n');
		await mkdir(path.join(output, 'sdk'));
		await symlink(path.join(repo, 'examples/star-catcher/node_modules'), path.join(output, 'sdk/node_modules'), 'dir');
		const directory = await prepareTrial(output, 'new', 'control');
		const protectedFiles = await fingerprint(directory);
		await cp(new URL('./fixtures/coin-lanes/Main.ts', import.meta.url), path.join(directory, 'src/Main.ts'));
		const checks = await acceptance(directory, path.join(output, 'positive'), protectedFiles);
		expect(checks, JSON.stringify(checks)).toHaveLength(6);
		expect(checks.every(check => check.passed), JSON.stringify(checks)).toBe(true);
		const { readFile } = await import('node:fs/promises');
		const source = await readFile(path.join(directory, 'src/Main.ts'), 'utf8');
		await writeFile(path.join(directory, 'src/Main.ts'), source.replace('score++;', 'score += 2;'));
		const broken = await acceptance(directory, path.join(output, 'negative'), protectedFiles);
		expect(broken.find(check => check.id === 'input-score')?.passed).toBe(false);
		expect(broken.find(check => check.id === 'typecheck')?.passed).toBe(true);
	} finally {
		await rm(output, { recursive: true, force: true });
	}
}, 60000);
