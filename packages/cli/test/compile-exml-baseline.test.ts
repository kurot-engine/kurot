import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext } from '../src/core/pipeline.js';
import { compileExml } from '../src/core/plugins/compile-exml.js';
import type { BuildMode, Project } from '../src/core/project.js';
import { logger } from '../src/utils/logger.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(testDir, 'fixtures/diagnostics');
const temporaryDirs: string[] = [];

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(temporaryDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('compile EXML behavior baseline', () => {
	it('compiles a valid development skin and rewrites its theme', async () => {
		const { ctx, outputDir } = await createFixtureContext('valid', 'development');

		await compileExml().apply(ctx);

		expect(ctx.outputs.skinsScript).toBe('js/default.thm.js');
		const skinsScript = ctx.outputs.skinsScript;
		if (!skinsScript) throw new Error('Expected compileExml to emit a skins script');
		const script = await fs.readFile(path.join(outputDir, skinsScript), 'utf-8');
		expect(script).toContain('function createValidSkin()');
		expect(script).toContain('new Button()');
		expect(script).toContain('submitButton.label = "Submit"');
		expect(script).toContain('globalThis["skins.ValidSkin"] = createValidSkin');

		const theme = JSON.parse(
			await fs.readFile(path.join(outputDir, 'resource/default.thm.json'), 'utf-8'),
		) as Record<string, unknown>;
		expect(theme).toEqual({
			skins: { 'kurot.ui.Button': 'skins.ValidSkin' },
			skinsJs: '../js/default.thm.js',
		});
	});

	it('warns and drops an unknown tag in development while still emitting a skin', async () => {
		const warning = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const { ctx, outputDir } = await createFixtureContext('unknown-tag', 'development');

		await compileExml().apply(ctx);

		expect(warning).toHaveBeenCalledWith(
			'skins/UnknownTagSkin.exml: unresolved tag(s) dropped from skin: eui:Buton',
		);
		const scriptPath = path.join(outputDir, ctx.outputs.skinsScript ?? 'missing');
		const script = await fs.readFile(scriptPath, 'utf-8');
		expect(script).not.toContain('Buton');
		expect(script).not.toContain('misspelledButton');
		expect(script).toContain('new Label()');
		expect(script).toContain('survivingLabel.text = "Still generated"');
	});

	it('emits an empty skin factory after a development parse failure', async () => {
		const warning = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const { ctx, outputDir } = await createFixtureContext('malformed', 'development');

		await compileExml().apply(ctx);

		expect(warning).toHaveBeenCalledWith(
			expect.stringContaining('EXML compile failed for skins/MalformedSkin.exml:'),
		);
		const scriptPath = path.join(outputDir, ctx.outputs.skinsScript ?? 'missing');
		const script = await fs.readFile(scriptPath, 'utf-8');
		expect(script).toContain('function createMalformedSkin()');
		expect(script).toContain('return {}');
	});

	it('rejects the same parse failure in release mode', async () => {
		const { ctx } = await createFixtureContext('malformed', 'release');

		await expect(compileExml().apply(ctx)).rejects.toThrow(
			'EXML compile failed for skins/MalformedSkin.exml:',
		);
	});

	it('warns and skips output when a theme-declared EXML file is missing', async () => {
		const warning = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const { ctx, outputDir } = await createFixtureContext('missing-declared', 'development');

		await compileExml().apply(ctx);

		expect(warning).toHaveBeenCalledWith(
			'declared EXML not found, skipping: resource/skins/MissingSkin.exml',
		);
		expect(ctx.outputs.skinsScript).toBeUndefined();
		await expect(fs.access(path.join(outputDir, 'resource/default.thm.json'))).rejects.toThrow();
	});
});

async function createFixtureContext(
	fixtureName: string,
	mode: BuildMode,
): Promise<{ ctx: ReturnType<typeof createContext>; outputDir: string }> {
	const root = path.join(fixturesDir, fixtureName);
	const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), `kurot-cli-${fixtureName}-`));
	temporaryDirs.push(outputDir);
	const resourceDir = path.join(root, 'resource');
	const themeFile = path.join(resourceDir, 'default.thm.json');
	const project: Project = {
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
			exml: { themeFile: 'resource/default.thm.json' },
		},
		entry: path.join(root, 'src/Main.ts'),
		srcDir: path.join(root, 'src'),
		outputDir,
		resourceDir,
		themeFile,
		enginePackages: [],
		customNamespaces: [],
	};

	return { ctx: createContext(project), outputDir };
}
