import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createCliProject, runCli } from './cli-process-helpers.js';

const projects: string[] = [];

afterEach(async () => {
	await Promise.all(projects.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('versioned assets CLI configuration', () => {
	it('packages a complete release with generated KUI and import-map dependencies', async () => {
		const root = await project('true');
		const result = await runCli(root, ['build', '--release', '--diagnostics', 'json']);
		expect(result.exitCode, result.stderr).toBe(0);
		const output = JSON.parse(result.stdout) as { outputDir: string };
		const html = await fs.readFile(path.join(output.outputDir, 'index.html'), 'utf8');
		const base = /<base href="\.\/([^"]+)"/.exec(html)?.[1];
		expect(base).toMatch(/^assets\/[a-f0-9]{32}\/$/);
		const resourceDir = path.join(output.outputDir, base!, 'resource');
		expect(await fs.readFile(path.join(resourceDir, 'test.txt'), 'utf8')).toBe('resource content');
		const theme = JSON.parse(await fs.readFile(path.join(resourceDir, 'default.thm.json'), 'utf8')) as {
			skinsJs: string;
		};
		expect((await fs.stat(path.resolve(resourceDir, theme.skinsJs))).isFile()).toBe(true);
	});

	it('rejects non-boolean configuration instead of silently enabling versioning', async () => {
		const root = await project('"true"');
		const result = await runCli(root, ['build', '--release']);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain('output.versionedAssets must be a boolean');
	});
});

async function project(enabled: string): Promise<string> {
	const root = await createCliProject('<Skin xmlns="https://kurot.dev/ui/1" class="skins.TestSkin"><Group/></Skin>');
	projects.push(root);
	const configPath = path.join(root, 'kurot.config.ts');
	const config = await fs.readFile(configPath, 'utf8');
	await fs.writeFile(
		configPath,
		config.replace("output: { dir: 'bin-debug' }", `output: { dir: 'bin-debug', versionedAssets: ${enabled} }`),
	);
	await fs.writeFile(path.join(root, 'resource/test.txt'), 'resource content');
	return root;
}
