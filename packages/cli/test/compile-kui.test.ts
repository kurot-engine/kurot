/// <reference types="node" />

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DIAGNOSTIC_CODES } from '../src/core/diagnostics/index.js';
import { createContext } from '../src/core/pipeline.js';
import { compileKUI } from '../src/core/plugins/compile-kui.js';
import type { Project } from '../src/core/project.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })),
	);
});

describe('compile KUI', () => {
	it('emits exact literal text with typed numbers and native state overrides', async () => {
		const xml =
			'<Skin xmlns="https://kurot.dev/ui/1" class="AmountSkin" states="down"><Label id="amount" text="100.80" text.down="false" size="48" /><Button id="button" label="true" enabled="false" /></Skin>';
		const { context, root, outputDirectory } = await createFixture([xml]);
		await compileKUI().apply(context);
		const script = await fs.readFile(path.join(outputDirectory, 'js/default.thm.js'), 'utf8');

		expect(script).toContain('amount.text = "100.80"');
		expect(script).toContain('amount.size = 48');
		expect(script).toContain('new SetProperty("amount", "text", "false")');
		expect(script).toContain('button.label = "true"');
		expect(script).toContain('button.enabled = false');
		expect(await fs.readFile(path.join(root, 'resource/ui/Document0.kui.xml'), 'utf8')).toBe(xml);
	});

	it('reads resource defaults on each build and retains the last good bundle on invalid manifests', async () => {
		const xml = '<Skin xmlns="https://kurot.dev/ui/1" class="Test"><Image id="image" source="panel"/></Skin>';
		const { context, root, outputDirectory } = await createFixture([xml]);
		const manifestPath = path.join(root, 'resource/default.res.json');
		const manifest = {
			resources: [
				{ name: 'atlas', type: 'sheet', url: 'atlas.json', subkeys: { panel: { scale9grid: '2,3,4,5' } } },
			],
			groups: [],
		};
		await fs.writeFile(manifestPath, JSON.stringify(manifest));
		await compileKUI().apply(context);
		const output = path.join(outputDirectory, 'js/default.thm.js');
		expect(await fs.readFile(output, 'utf8')).toContain('new Rectangle(2, 3, 4, 5)');
		manifest.resources[0]!.subkeys.panel.scale9grid = '1,1,8,8';
		await fs.writeFile(manifestPath, JSON.stringify(manifest));
		await compileKUI().apply(context);
		const lastGood = await fs.readFile(output, 'utf8');
		expect(lastGood).toContain('new Rectangle(1, 1, 8, 8)');
		await fs.writeFile(
			manifestPath,
			JSON.stringify({ resources: [{ name: 'atlas', type: 'sheet', url: 'atlas.json', subkeys: 'panel' }] }),
		);
		await expect(compileKUI().apply(context)).rejects.toThrow('subkeys must be an object');
		expect(await fs.readFile(output, 'utf8')).toBe(lastGood);
		expect(await fs.readFile(path.join(root, 'resource/ui/Document0.kui.xml'), 'utf8')).toBe(xml);
	});

	it('builds skin factories and generates default theme mappings from internal conventions', async () => {
		const { context, outputDirectory, root } = await createFixture([
			skin('skins.ButtonSkin'),
			skin('skins.ToggleButtonSkin'),
		]);

		await compileKUI().apply(context);

		expect(context.outputs.skinsScript).toBe('js/default.thm.js');
		const script = await fs.readFile(path.join(outputDirectory, 'js/default.thm.js'), 'utf8');
		expect(script).toContain('globalThis["skins.ButtonSkin"]');
		const theme = JSON.parse(
			await fs.readFile(path.join(outputDirectory, 'resource/default.thm.json'), 'utf8'),
		) as { skins: Record<string, string>; skinsJs: string };
		expect(theme).toEqual({
			skins: {
				Button: 'skins.ButtonSkin',
				ToggleButton: 'skins.ToggleButtonSkin',
			},
			skinsJs: '../js/default.thm.js',
		});
		const declaration = await fs.readFile(path.join(root, '.kurot/skin-parts.d.ts'), 'utf8');
		expect(declaration).toContain('"skins.ButtonSkin"');
		expect(declaration).toContain('readonly "labelDisplay"');
	});

	it('reports duplicate conventional default skins for one component', async () => {
		const { context } = await createFixture([skin('skins.ButtonSkin'), skin('alternate.ButtonSkin')]);

		await expect(compileKUI().apply(context)).rejects.toThrow('KUI input validation failed.');
		expect(context.diagnostics.all()[0]?.code).toBe(DIAGNOSTIC_CODES.KUI_DUPLICATE_DEFAULT);
	});

	it('reports malformed KUI source with a stable diagnostic code', async () => {
		const { context } = await createFixture(['<Skin>']);

		await expect(compileKUI().apply(context)).rejects.toThrow('KUI input validation failed.');
		expect(context.diagnostics.all()[0]?.code).toBe(DIAGNOSTIC_CODES.KUI_COMPILE_FAILED);
	});

	it('does not emit a theme when no Skin documents exist', async () => {
		const { context, outputDirectory } = await createFixture([]);

		await compileKUI().apply(context);

		expect(context.outputs.skinsScript).toBeUndefined();
		await expect(fs.access(path.join(outputDirectory, 'resource/default.thm.json'))).rejects.toThrow();
	});
});

async function createFixture(sources: readonly string[]): Promise<{
	readonly context: ReturnType<typeof createContext>;
	readonly outputDirectory: string;
	readonly root: string;
}> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-kui-'));
	temporaryDirectories.push(root);
	const sourceDirectory = path.join(root, 'resource/ui');
	const outputDirectory = path.join(root, 'bin-debug');
	await Promise.all([
		fs.mkdir(sourceDirectory, { recursive: true }),
		fs.mkdir(path.join(root, 'src'), { recursive: true }),
		fs.mkdir(outputDirectory, { recursive: true }),
	]);
	await Promise.all(
		sources.map((source, index) => fs.writeFile(path.join(sourceDirectory, `Document${index}.kui.xml`), source)),
	);
	const project: Project = {
		root,
		mode: 'development',
		config: {
			target: 'html5',
			entry: 'src/Main.ts',
			output: { dir: 'bin-debug' },
			stage: { width: 640, height: 400, scaleMode: 'showAll', orientation: 'auto', frameRate: 60 },
			ui: { sourceDir: 'resource/ui' },
		},
		entry: path.join(root, 'src/Main.ts'),
		srcDir: path.join(root, 'src'),
		outputDir: outputDirectory,
		resourceDir: path.join(root, 'resource'),
		uiSourceDir: sourceDirectory,
		enginePackages: [],
		customNamespaces: [],
		components: [],
	};
	return { context: createContext(project, {}), outputDirectory, root };
}

function skin(className: string): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<Skin xmlns="https://kurot.dev/ui/1" class="${className}">
	<Label id="labelDisplay" text="Play" />
</Skin>
`;
}
