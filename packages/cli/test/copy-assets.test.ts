import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createContext } from '../src/core/pipeline.js';
import { copyAssets } from '../src/core/plugins/copy-assets.js';
import type { BuildMode, Project } from '../src/core/project.js';
import { copyDir, exists, writeFile } from '../src/utils/fs.js';

const directories: string[] = [];

afterEach(async () => {
	await Promise.all(directories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })));
});

describe('runtime asset copying', () => {
	it.each<BuildMode>(['development', 'release'])('omits source-only KUI directories in %s output and preserves the compiled theme', async mode => {
		const project = await fixture(mode);
		await writeFile(path.join(project.resourceDir, 'ui/app/Panel.kui.xml'), '<Skin/>');
		await fs.mkdir(path.join(project.resourceDir, 'ui/components/empty'), { recursive: true });
		await writeFile(path.join(project.resourceDir, 'default.thm.json'), 'old authored theme');
		await writeFile(path.join(project.outputDir, 'resource/default.thm.json'), 'compiled theme');
		await writeFile(path.join(project.resourceDir, 'default.res.json'), '{"resources":[]}');
		await copyAssets().apply(createContext(project));

		expect(await exists(path.join(project.outputDir, 'resource/ui'))).toBe(false);
		expect(await fs.readFile(path.join(project.outputDir, 'resource/default.thm.json'), 'utf8')).toBe('compiled theme');
		expect(await fs.readFile(path.join(project.outputDir, 'resource/default.res.json'), 'utf8')).toBe('{"resources":[]}');
	});

	it('preserves runtime files inside UI directories while excluding their KUI-only siblings', async () => {
		const project = await fixture('release');
		await writeFile(path.join(project.resourceDir, 'ui/mixed/Panel.kui.xml'), '<Skin/>');
		await writeFile(path.join(project.resourceDir, 'ui/mixed/atlas.json'), '{"file":"atlas.png"}');
		const bytes = Buffer.from([137, 80, 78, 71]);
		await fs.writeFile(path.join(project.resourceDir, 'ui/mixed/atlas.png'), bytes);
		await writeFile(path.join(project.resourceDir, 'ui/source-only/Panel.kui.xml'), '<Skin/>');
		await copyAssets().apply(createContext(project));

		expect(await fs.readFile(path.join(project.outputDir, 'resource/ui/mixed/atlas.png'))).toEqual(bytes);
		expect(await fs.readFile(path.join(project.outputDir, 'resource/ui/mixed/atlas.json'), 'utf8')).toBe('{"file":"atlas.png"}');
		expect(await exists(path.join(project.outputDir, 'resource/ui/mixed/Panel.kui.xml'))).toBe(false);
		expect(await exists(path.join(project.outputDir, 'resource/ui/source-only'))).toBe(false);
	});

	it('keeps XML and theme files as runtime assets when KUI is disabled', async () => {
		const project = await fixture('release', false);
		await writeFile(path.join(project.resourceDir, 'ui/Panel.kui.xml'), 'runtime XML');
		await writeFile(path.join(project.resourceDir, 'default.thm.json'), 'runtime theme');
		await copyAssets().apply(createContext(project));

		expect(await fs.readFile(path.join(project.outputDir, 'resource/ui/Panel.kui.xml'), 'utf8')).toBe('runtime XML');
		expect(await fs.readFile(path.join(project.outputDir, 'resource/default.thm.json'), 'utf8')).toBe('runtime theme');
	});

	it('still preserves empty directories for template copies', async () => {
		const project = await fixture('development');
		await fs.mkdir(path.join(project.resourceDir, 'ui/empty'), { recursive: true });
		await copyDir(project.resourceDir, path.join(project.outputDir, 'resource'));

		expect((await fs.stat(path.join(project.outputDir, 'resource/ui/empty'))).isDirectory()).toBe(true);
	});
});

async function fixture(mode: BuildMode, enabled = true): Promise<Project> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-copy-assets-'));
	directories.push(root);
	return {
		root,
		mode,
		config: {
			target: 'html5',
			entry: 'src/Main.ts',
			output: { dir: 'output' },
			stage: { width: 640, height: 400, scaleMode: 'showAll', orientation: 'auto', frameRate: 60 },
			ui: enabled ? { sourceDir: 'resource/ui' } : undefined,
		},
		entry: path.join(root, 'src/Main.ts'),
		srcDir: path.join(root, 'src'),
		outputDir: path.join(root, 'output'),
		resourceDir: path.join(root, 'resource'),
		uiSourceDir: enabled ? path.join(root, 'resource/ui') : undefined,
		enginePackages: [],
		customNamespaces: [],
		components: [],
	};
}
