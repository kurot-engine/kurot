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
	await Promise.all(temporaryDirectories.splice(0).map(directory =>
		fs.rm(directory, { recursive: true, force: true }),
	));
});

describe('compile KUI', () => {
	it('builds skin factories and generates default theme mappings from Skin metadata', async () => {
		const { context, outputDirectory, root } = await createFixture([
			skin('skins.ButtonSkin', 'kui.Button', true),
		]);

		await compileKUI().apply(context);

		expect(context.outputs.skinsScript).toBe('js/default.thm.js');
		const script = await fs.readFile(path.join(outputDirectory, 'js/default.thm.js'), 'utf8');
		expect(script).toContain('globalThis["skins.ButtonSkin"]');
		const theme = JSON.parse(
			await fs.readFile(path.join(outputDirectory, 'resource/default.thm.json'), 'utf8'),
		) as { skins: Record<string, string>; skinsJs: string };
		expect(theme).toEqual({
			skins: { Button: 'skins.ButtonSkin' },
			skinsJs: '../js/default.thm.js',
		});
		const declaration = await fs.readFile(path.join(root, '.kurot/skin-parts.d.ts'), 'utf8');
		expect(declaration).toContain('"skins.ButtonSkin"');
		expect(declaration).toContain('readonly "labelDisplay"');
	});

	it('reports duplicate default skins for one target', async () => {
		const { context } = await createFixture([
			skin('skins.ButtonSkin', 'kui.Button', true),
			skin('skins.AlternateButtonSkin', 'kui.Button', true),
		]);

		await expect(compileKUI().apply(context)).rejects.toThrow('KUI input validation failed.');
		expect(context.diagnostics.all()[0]?.code).toBe(DIAGNOSTIC_CODES.KUI_DUPLICATE_DEFAULT);
	});

	it('reports malformed KUI source with a stable diagnostic code', async () => {
		const { context } = await createFixture(['<Skin>']);

		await expect(compileKUI().apply(context)).rejects.toThrow('KUI input validation failed.');
		expect(context.diagnostics.all()[0]?.code).toBe(DIAGNOSTIC_CODES.KUI_COMPILE_FAILED);
	});

	it('does not emit a theme when no Skin documents exist', async () => {
		const { context, outputDirectory } = await createFixture([screen()]);

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
	await Promise.all(sources.map((source, index) =>
		fs.writeFile(path.join(sourceDirectory, `Document${index}.kui.xml`), source),
	));
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

function skin(id: string, target: string, isDefault: boolean): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<Skin xmlns="https://kurot.dev/ui/1" id="${id}" version="2" target="${target}" default="${isDefault}">
	<contract><parts><part name="labelDisplay" node="labelDisplay" /></parts></contract>
	<Group id="root"><Label id="labelDisplay" text="Play" /></Group>
</Skin>
`;
}

function screen(): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<Screen xmlns="https://kurot.dev/ui/1" id="main" version="2"><Group id="root" /></Screen>
`;
}
