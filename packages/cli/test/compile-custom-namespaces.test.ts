import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { normalizeModuleKey } from '../src/core/namespace-external-plugin.js';
import { refreshProjectComponents } from '../src/core/components/discover-components.js';
import { createContext, disposeContext } from '../src/core/pipeline.js';
import {
	compileCustomNamespaces,
	refreshGeneratedNamespaceEntries,
} from '../src/core/plugins/compile-custom-namespaces.js';
import type { Project, ProjectComponent } from '../src/core/project.js';

const temporaryDirs: string[] = [];

afterEach(async () => {
	await Promise.all(temporaryDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('automatic component namespace compilation', () => {
	it('does not emit an empty namespace chunk for a non-watch build', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-empty-component-namespace-'));
		temporaryDirs.push(root);
		const placeholder = createComponent(root, path.join(root, 'src/components/Placeholder.ts'));
		const project = createProject(root, path.join(root, 'bin-debug'), placeholder);
		project.components.splice(0);
		const ctx = createContext(project);

		await compileCustomNamespaces().apply(ctx);

		expect(ctx.outputs.engine).toEqual({});
		await expect(fs.access(path.join(project.outputDir, 'js/ns.game.js'))).rejects.toThrow();
	});

	it('generates and bundles a namespace entry for discovered components', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-component-namespace-'));
		temporaryDirs.push(root);
		const source = path.join(root, 'src/components/BetButton.ts');
		await fs.mkdir(path.dirname(source), { recursive: true });
		await fs.writeFile(source, 'export class BetButton { public amount = 0; }\n');
		const component = createComponent(root, source);
		const outputDir = path.join(root, 'bin-debug');
		const project = createProject(root, outputDir, component);
		const ctx = createContext(project);

		await compileCustomNamespaces().apply(ctx);

		expect(ctx.outputs.engine['#ns/game']).toBe('js/ns.game.js');
		const output = await fs.readFile(path.join(outputDir, 'js/ns.game.js'), 'utf-8');
		expect(output).toContain('BetButton = class');
		expect(output).toContain('export {');
		expect(output).toContain('BetButton');
		expect(ctx.outputs.namespaceModules.get(normalizeModuleKey(source))).toBe('#ns/game');
	});

	it('preserves component constructor names in a minified release namespace', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-release-component-namespace-'));
		temporaryDirs.push(root);
		const source = path.join(root, 'src/components/BetButton.ts');
		await fs.mkdir(path.dirname(source), { recursive: true });
		await fs.writeFile(source, 'export class BetButton {}\n');
		const project = createProject(root, path.join(root, 'bin-release'), createComponent(root, source), 'release');
		const ctx = createContext(project);

		await compileCustomNamespaces().apply(ctx);

		const chunk = ctx.outputs.engine['#ns/game'];
		if (!chunk) throw new Error('Expected a release namespace chunk');
		const module = (await import(pathToFileURL(path.join(project.outputDir, chunk)).href)) as {
			BetButton: new () => unknown;
		};
		expect(module.BetButton.name).toBe('BetButton');
	});

	it('refreshes a watched namespace after a component pair is added', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-component-watch-'));
		temporaryDirs.push(root);
		const sourceDir = path.join(root, 'src/components');
		const skinDir = path.join(root, 'resource/skins/components');
		await fs.mkdir(sourceDir, { recursive: true });
		await fs.mkdir(skinDir, { recursive: true });
		const firstSource = path.join(sourceDir, 'BetButton.ts');
		await fs.writeFile(firstSource, 'export class BetButton {}\n');
		await fs.writeFile(
			path.join(skinDir, 'BetButtonSkin.exml'),
			'<eui:Skin class="components.BetButtonSkin" xmlns:eui="http://ns.egret.com/eui"/>',
		);
		const project = createProject(root, path.join(root, 'bin-debug'), createComponent(root, firstSource));
		const ctx = createContext(project, { watch: true });

		try {
			await compileCustomNamespaces().apply(ctx);
			await fs.writeFile(path.join(sourceDir, 'HistoryItem.ts'), 'export class HistoryItem {}\n');
			await fs.writeFile(
				path.join(skinDir, 'HistoryItemSkin.exml'),
				'<eui:Skin class="components.HistoryItemSkin" xmlns:eui="http://ns.egret.com/eui"/>',
			);

			await refreshProjectComponents(project);
			await refreshGeneratedNamespaceEntries(ctx);

			const output = await fs.readFile(path.join(project.outputDir, 'js/ns.game.js'), 'utf-8');
			expect(project.components.map(component => component.name)).toEqual(['BetButton', 'HistoryItem']);
			expect(output).toContain('HistoryItem');
			expect(ctx.outputs.namespaceModules.get(normalizeModuleKey(path.join(sourceDir, 'HistoryItem.ts')))).toBe(
				'#ns/game',
			);
		} finally {
			await disposeContext(ctx);
		}
	});
});

function createComponent(root: string, source: string): ProjectComponent {
	return {
		name: 'BetButton',
		tag: 'game:BetButton',
		namespace: 'game',
		specifier: '#ns/game',
		source,
		sourceRelative: 'src/components/BetButton.ts',
		skin: path.join(root, 'resource/skins/components/BetButtonSkin.exml'),
		skinRelative: 'resource/skins/components/BetButtonSkin.exml',
		skinClass: 'components.BetButtonSkin',
	};
}

function createProject(
	root: string,
	outputDir: string,
	component: ProjectComponent,
	mode: Project['mode'] = 'development',
): Project {
	const components = [component];
	return {
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
	};
}
