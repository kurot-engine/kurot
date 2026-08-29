import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createContext } from '../src/core/pipeline.js';
import { writeComponentCatalog } from '../src/core/plugins/component-catalog.js';
import type { BuildMode, Project, ProjectComponent } from '../src/core/project.js';

const temporaryDirs: string[] = [];

afterEach(async () => {
	await Promise.all(temporaryDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('component catalog', () => {
	it('writes stable component metadata in development mode', async () => {
		const { project, outputDir } = await createProject('development');
		const ctx = createContext(project);

		await writeComponentCatalog().apply(ctx);

		expect(ctx.outputs.componentCatalog).toBe('.kurot/component-catalog.json');
		const catalog = JSON.parse(
			await fs.readFile(path.join(outputDir, '.kurot/component-catalog.json'), 'utf-8'),
		) as Record<string, unknown>;
		expect(catalog).toEqual({
			schemaVersion: 1,
			namespace: 'game',
			components: [
				{
					name: 'BetButton',
					tag: 'game:BetButton',
					source: 'src/components/BetButton.ts',
					skin: 'resource/skins/components/BetButtonSkin.exml',
					skinClass: 'components.BetButtonSkin',
				},
			],
		});
	});

	it('does not ship the tooling catalog in release mode', async () => {
		const { project, outputDir } = await createProject('release');
		const ctx = createContext(project);

		await writeComponentCatalog().apply(ctx);

		expect(ctx.outputs.componentCatalog).toBeUndefined();
		await expect(fs.access(path.join(outputDir, '.kurot/component-catalog.json'))).rejects.toThrow();
	});
});

async function createProject(mode: BuildMode): Promise<{ project: Project; outputDir: string }> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-component-catalog-'));
	temporaryDirs.push(root);
	const outputDir = path.join(root, mode === 'development' ? 'bin-debug' : 'bin-release/web/version');
	const component: ProjectComponent = {
		name: 'BetButton',
		tag: 'game:BetButton',
		namespace: 'game',
		specifier: '#ns/game',
		source: path.join(root, 'src/components/BetButton.ts'),
		sourceRelative: 'src/components/BetButton.ts',
		skin: path.join(root, 'resource/skins/components/BetButtonSkin.exml'),
		skinRelative: 'resource/skins/components/BetButtonSkin.exml',
		skinClass: 'components.BetButtonSkin',
	};
	const components = [component];
	return {
		outputDir,
		project: {
			root,
			mode,
			config: {
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
			},
			entry: path.join(root, 'src/Main.ts'),
			srcDir: path.join(root, 'src'),
			outputDir,
			resourceDir: path.join(root, 'resource'),
			enginePackages: [],
			customNamespaces: [{ prefix: 'game', specifier: '#ns/game', components }],
			componentConvention: {
				prefix: 'game',
				specifier: '#ns/game',
				sourceDir: path.join(root, 'src/components'),
				skinDir: path.join(root, 'resource/skins/components'),
			},
			components,
		},
	};
}
