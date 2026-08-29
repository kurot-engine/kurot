import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/core/config.js';
import { loadProject } from '../src/core/project.js';

const originalCwd = process.cwd();
const temporaryDirs: string[] = [];

afterEach(async () => {
	process.chdir(originalCwd);
	await Promise.all(temporaryDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('component configuration', () => {
	it('loads and resolves convention-based component directories', async () => {
		const root = await createProject({
			namespace: 'game',
			sourceDir: 'src/components',
			skinDir: 'resource/skins/components',
		});
		process.chdir(root);

		const project = await loadProject('development');

		expect(project.componentConvention).toEqual({
			prefix: 'game',
			specifier: '#ns/game',
			sourceDir: path.join(project.root, 'src/components'),
			skinDir: path.join(project.root, 'resource/skins/components'),
		});
	});

	it('rejects an invalid component namespace prefix', async () => {
		const root = await createProject({
			namespace: '9game',
			sourceDir: 'src/components',
			skinDir: 'resource/skins/components',
		});
		process.chdir(root);

		await expect(loadConfig()).rejects.toThrow(
			"exml.components.namespace must be a valid XML namespace prefix, got '9game'",
		);
	});

	it('keeps component sources and skins inside their standard project roots', async () => {
		const root = await createProject({
			namespace: 'game',
			sourceDir: '../shared-components',
			skinDir: 'resource/skins/components',
		});
		process.chdir(root);

		await expect(loadProject('development')).rejects.toThrow(
			'exml.components.sourceDir must be inside the project src directory',
		);
	});

	it('rejects a manual namespace that conflicts with the component namespace', async () => {
		const root = await createProject(
			{
				namespace: 'game',
				sourceDir: 'src/components',
				skinDir: 'resource/skins/components',
			},
			{ game: 'src/game-components.ts' },
		);
		process.chdir(root);

		await expect(loadProject('development')).rejects.toThrow(
			"exml.components.namespace 'game' conflicts with exml.namespaces.game",
		);
	});
});

async function createProject(
	components: {
		namespace: string;
		sourceDir: string;
		skinDir: string;
	},
	namespaces?: Record<string, string>,
): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-component-config-'));
	temporaryDirs.push(root);
	await fs.mkdir(path.join(root, 'src'), { recursive: true });
	await fs.writeFile(path.join(root, 'src/Main.ts'), 'export {};\n');
	await fs.writeFile(
		path.join(root, 'kurot.config.ts'),
		`export default ${JSON.stringify({
			target: 'html5',
			entry: 'src/Main.ts',
			output: { dir: 'bin-debug' },
			stage: {
				width: 640,
				height: 1136,
				scaleMode: 'showAll',
				orientation: 'auto',
				frameRate: 60,
			},
			exml: {
				themeFile: 'resource/default.thm.json',
				components,
				...(namespaces ? { namespaces } : {}),
			},
		})};\n`,
	);
	return root;
}
