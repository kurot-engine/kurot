import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { refreshProjectComponents } from '../src/core/components/discover-components.js';
import { createContext, disposeContext } from '../src/core/pipeline.js';
import { compileSource } from '../src/core/plugins/compile-source.js';
import { startSourceWatch } from '../src/core/source-watch.js';
import { namespaceEntriesPlugin } from '../src/core/namespace-entries.js';
import { skinPartValidationPlugin } from '../src/core/kui/skin-part-watch.js';
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

		await fs.mkdir(project.srcDir, { recursive: true });
		await fs.writeFile(project.entry, 'export {};\n');
		await compileSource().apply(ctx);

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

		await fs.mkdir(project.srcDir, { recursive: true });
		await fs.writeFile(project.entry, 'export {};\n');
		await compileSource().apply(ctx);

		expect(ctx.outputs.engine['#ns/game']).toBe('js/ns.game.js');
		const output = await fs.readFile(path.join(outputDir, 'js/ns.game.js'), 'utf-8');
		expect(output).toContain('export {');
		expect(output).toContain('BetButton');
		const direct = await import(pathToFileURL(path.join(outputDir, 'components/BetButton.js')).href);
		const barrel = await import(pathToFileURL(path.join(outputDir, 'js/ns.game.js')).href);
		expect(direct.BetButton).toBe(barrel.BetButton);
	});

	it.each(['development', 'release'] as const)('preserves self-referencing component names in a %s namespace', async mode => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-release-component-namespace-'));
		temporaryDirs.push(root);
		const source = path.join(root, 'src/components/BetButton.ts');
		await fs.mkdir(path.dirname(source), { recursive: true });
		await fs.writeFile(source, 'export class BetButton { static create() { return new BetButton(); } }\n');
		const project = createProject(root, path.join(root, 'bin-output'), createComponent(root, source), mode);
		const ctx = createContext(project);

		await fs.mkdir(project.srcDir, { recursive: true });
		await fs.writeFile(project.entry, 'export {};\n');
		await compileSource().apply(ctx);

		const chunk = ctx.outputs.engine['#ns/game'];
		if (!chunk) throw new Error('Expected a release namespace chunk');
		const module = (await import(pathToFileURL(path.join(project.outputDir, chunk)).href)) as {
			BetButton: new () => unknown;
		};
		expect(module.BetButton.name).toBe('BetButton');
	});

	it.each(['development', 'release'] as const)('shares private imports without exporting them from the %s barrel', async mode => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-shared-modules-'));
		temporaryDirs.push(root);
		const src = path.join(root, 'src');
		const pkg = path.join(root, 'node_modules/hash');
		await fs.mkdir(src);
		await fs.mkdir(pkg, { recursive: true });
		await fs.writeFile(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }));
		await fs.writeFile(path.join(pkg, 'package.json'), '{"type":"module","exports":"./hash.js"}');
		await fs.writeFile(path.join(pkg, 'internal.js'), 'export const Chi = () => 42;');
		await fs.writeFile(path.join(pkg, 'hash.js'), 'import {Chi} from "./internal.js"; export const digest = Chi;');
		await fs.writeFile(path.join(src, 'session.ts'), 'export const session = {};');
		await fs.writeFile(path.join(src, 'Widget.ts'), 'import {session} from "@/session"; import {digest} from "hash"; export class Widget { session = session; value = digest(); }');
		await fs.writeFile(path.join(src, 'barrel.ts'), 'export {Widget as Control} from "@/Widget";');
		const project = createProject(root, path.join(root, 'output'), createComponent(root, path.join(src, 'Widget.ts')), mode);
		project.customNamespaces.splice(0, 1, { prefix: 'game', specifier: '#ns/game', entry: path.join(src, 'barrel.ts') });
		await fs.writeFile(project.entry, [
			'export {Widget as Relative} from "./Widget.js";',
			'export {Widget as Alias} from "@/Widget";',
			'export {Control as Namespaced} from "#ns/game";',
			'export {session} from "./session"; export {digest} from "hash";',
			'export const lazy = () => import("@/Widget");',
		].join('\n'));
		const ctx = createContext(project);
		await compileSource().apply(ctx);
		const app = await import(pathToFileURL(path.join(project.outputDir, ctx.outputs.entryScript!)).href);
		const ns = await import(pathToFileURL(path.join(project.outputDir, ctx.outputs.engine['#ns/game'])).href);
		expect(Object.keys(ns)).toEqual(['Control']);
		expect(ns.Control).toBe(app.Alias);
		expect(ns.Control).toBe(app.Relative);
		expect(ns.Control).toBe(app.Namespaced);
		expect((await app.lazy()).Widget).toBe(ns.Control);
		expect(new ns.Control().session).toBe(app.session);
		expect(new ns.Control().value).toBe(42);
		expect(app.digest()).toBe(42);
	});

	it('can load either release entry first when a public subclass participates in a registry cycle', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-registry-cycle-'));
		temporaryDirs.push(root);
		const src = path.join(root, 'src');
		await fs.mkdir(src);
		await fs.writeFile(path.join(src, 'Base.ts'), 'import { lookup } from "./registry"; export class Base { lookup() { return lookup(); } }');
		await fs.writeFile(path.join(src, 'Derived.ts'), 'import {Base} from "./Base"; export class Derived extends Base {}');
		await fs.writeFile(path.join(src, 'registry.ts'), 'import {Derived} from "./Derived"; export const lookup = () => Derived;');
		await fs.writeFile(path.join(src, 'barrel.ts'), 'export {Derived} from "./Derived";');
		const project = createProject(root, path.join(root, 'out'), createComponent(root, path.join(src, 'Derived.ts')), 'release');
		project.customNamespaces.splice(0, 1, { prefix: 'game', specifier: '#ns/game', entry: path.join(src, 'barrel.ts') });
		await fs.writeFile(project.entry, 'export {lookup} from "./registry"; export {Base} from "./Base";');
		const ctx = createContext(project);
		await compileSource().apply(ctx);
		const app = pathToFileURL(path.join(project.outputDir, ctx.outputs.entryScript!)).href;
		const ns = pathToFileURL(path.join(project.outputDir, ctx.outputs.engine['#ns/game'])).href;
		for (const first of [app, ns]) {
			// Each order needs a fresh ESM cache.
			execFileSync(process.execPath, ['--input-type=module', '-e', `
				await import(${JSON.stringify(first)});
				const a = await import(${JSON.stringify(app)}), n = await import(${JSON.stringify(ns)});
				if (new a.Base().lookup() !== n.Derived || !(new n.Derived() instanceof a.Base)) process.exit(1);
			`]);
		}
	});

	it.each([false, true])('installs new namespace exports when a refresh overlaps an older build (old failure: %s)', async oldFails => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-namespace-overlap-'));
		temporaryDirs.push(root);
		const first = createComponent(root, path.join(root, 'BetButton.ts'));
		const project = createProject(root, path.join(root, 'out'), first);
		const ctx = createContext(project, { watch: true });
		const second = { ...first, name: 'HistoryItem', source: path.join(root, 'HistoryItem.ts') };
		await fs.writeFile(first.source, 'export class BetButton {}');
		await fs.writeFile(second.source, 'export class HistoryItem {}');
		const output = path.join(project.outputDir, 'ns.mjs');
		const captured = Promise.withResolvers<void>();
		const resume = Promise.withResolvers<void>();
		let builds = 0;
		try {
			await startSourceWatch(ctx, {
				absWorkingDir: root, entryPoints: ['#ns/game'], bundle: true, format: 'esm', outfile: output,
				plugins: [namespaceEntriesPlugin(project.customNamespaces, root), skinPartValidationPlugin(ctx), {
					name: 'hold-old-output',
					setup(build): void {
						build.onEnd(async () => {
							if (++builds === 2) {
								captured.resolve();
								await resume.promise;
								if (oldFails) {
									return { errors: [{ text: 'Stale component list' }] };
								}
							}
						});
					},
				}],
			});
			const old = ctx.outputs.sourceRebuilder!().catch(error => {
				if (!oldFails || !String(error).includes('Stale component list')) {
					throw error;
				}
			});
			await captured.promise;
			project.components.push(second);
			const refreshed = ctx.outputs.sourceRebuilder!();
			resume.resolve();
			await Promise.all([old, refreshed]);
			const namespace = await import(pathToFileURL(output).href);
			expect(Object.keys(namespace)).toEqual(['BetButton', 'HistoryItem']);
		} finally {
			resume.resolve();
			await disposeContext(ctx);
		}
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
			path.join(skinDir, 'BetButtonSkin.kui.xml'),
			componentSkin('components.BetButtonSkin'),
		);
		const project = createProject(root, path.join(root, 'bin-debug'), createComponent(root, firstSource));
		const ctx = createContext(project, { watch: true });

		try {
			await fs.mkdir(project.srcDir, { recursive: true });
			await fs.writeFile(project.entry, 'export {};\n');
			await compileSource().apply(ctx);
			await fs.writeFile(path.join(sourceDir, 'HistoryItem.ts'), 'export class HistoryItem {}\n');
			await fs.writeFile(
				path.join(skinDir, 'HistoryItemSkin.kui.xml'),
				componentSkin('components.HistoryItemSkin'),
			);

			await refreshProjectComponents(project);
			await ctx.outputs.sourceRebuilder?.();

			const output = await fs.readFile(path.join(project.outputDir, 'js/ns.game.js'), 'utf-8');
			expect(project.components.map(component => component.name)).toEqual(['BetButton', 'HistoryItem']);
			expect(output).toContain('HistoryItem');
			const namespace = await import(pathToFileURL(path.join(project.outputDir, 'js/ns.game.js')).href);
			expect(new namespace.HistoryItem().constructor.name).toBe('HistoryItem');
		} finally {
			await disposeContext(ctx);
		}
	});
});

function componentSkin(id: string): string {
	return `<Skin xmlns="https://kurot.dev/ui/1" class="${id}"><Group id="root" /></Skin>`;
}

function createComponent(root: string, source: string): ProjectComponent {
	return {
		name: 'BetButton',
		tag: 'game:BetButton',
		namespace: 'game',
		specifier: '#ns/game',
		source,
		sourceRelative: 'src/components/BetButton.ts',
		skin: path.join(root, 'resource/skins/components/BetButtonSkin.kui.xml'),
		skinRelative: 'resource/skins/components/BetButtonSkin.kui.xml',
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
