import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, runPipeline } from '../src/core/pipeline.js';
import { DIAGNOSTIC_CODES } from '../src/core/diagnostics/index.js';
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
			'skins/UnknownTagSkin.exml: Unknown EXML tag "eui:Buton" was dropped from the generated skin.',
		);
		expect(ctx.diagnostics.all()).toEqual([
			{
				code: DIAGNOSTIC_CODES.EXML_UNKNOWN_TAG,
				severity: 'warning',
				message: 'Unknown EXML tag "eui:Buton" was dropped from the generated skin.',
				location: {
					file: 'skins/UnknownTagSkin.exml',
					line: 3,
					column: 2,
					offset: 116,
				},
				suggestions: ['Did you mean "eui:Button"?'],
			},
		]);
		const scriptPath = path.join(outputDir, ctx.outputs.skinsScript ?? 'missing');
		const script = await fs.readFile(scriptPath, 'utf-8');
		expect(script).not.toContain('Buton');
		expect(script).not.toContain('misspelledButton');
		expect(script).toContain('new Label()');
		expect(script).toContain('survivingLabel.text = "Still generated"');
	});

	it('stops the pipeline when strict mode promotes an unknown tag diagnostic', async () => {
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const { ctx } = await createFixtureContext('unknown-tag', 'development', true);

		await expect(runPipeline(ctx, [compileExml()])).rejects.toThrow('EXML compilation failed.');
		expect(ctx.diagnostics.all()[0]?.severity).toBe('error');
	});

	it('rejects a development parse failure without emitting an empty skin factory', async () => {
		const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		const { ctx, outputDir } = await createFixtureContext('malformed', 'development');

		await expect(compileExml().apply(ctx)).rejects.toThrow('EXML compilation failed.');

		expect(error).toHaveBeenCalledWith(
			expect.stringContaining('skins/MalformedSkin.exml: EXML compile failed:'),
		);
		expect(ctx.diagnostics.all()).toEqual([
			expect.objectContaining({
				code: DIAGNOSTIC_CODES.EXML_COMPILE_FAILED,
				severity: 'error',
				location: { file: 'skins/MalformedSkin.exml' },
			}),
		]);
		expect(ctx.outputs.skinsScript).toBeUndefined();
		await expect(fs.access(path.join(outputDir, 'js/default.thm.js'))).rejects.toThrow();
	});

	it('rejects the same parse failure in release mode', async () => {
		const { ctx } = await createFixtureContext('malformed', 'release');

		vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		await expect(compileExml().apply(ctx)).rejects.toThrow('EXML compilation failed.');
		expect(ctx.diagnostics.all()[0]?.code).toBe(DIAGNOSTIC_CODES.EXML_COMPILE_FAILED);
	});

	it('preserves the last successful bundle after failure and replaces it after recovery', async () => {
		vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		const { ctx, outputDir, root } = await createMutableFixtureContext('valid');
		await compileExml().apply(ctx);
		const skinsScript = ctx.outputs.skinsScript;
		if (!skinsScript) throw new Error('Expected the initial compilation to emit a skins script');
		const scriptPath = path.join(outputDir, skinsScript);
		const initialScript = await fs.readFile(scriptPath, 'utf-8');
		const skinPath = path.join(root, 'resource/skins/ValidSkin.exml');

		await fs.writeFile(
			skinPath,
			'<eui:Skin class="skins.ValidSkin" xmlns:eui="http://ns.egret.com/eui"><eui:Button></eui:Skin>',
		);
		await expect(compileExml().apply(ctx)).rejects.toThrow('EXML compilation failed.');
		expect(await fs.readFile(scriptPath, 'utf-8')).toBe(initialScript);

		await fs.writeFile(
			skinPath,
			'<eui:Skin class="skins.ValidSkin" xmlns:eui="http://ns.egret.com/eui"><eui:Button label="Recovered"/></eui:Skin>',
		);
		await compileExml().apply(ctx);
		const recoveredScript = await fs.readFile(scriptPath, 'utf-8');
		expect(recoveredScript).toContain('label = "Recovered"');
		expect(recoveredScript).not.toBe(initialScript);
		expect(ctx.diagnostics.all()).toEqual([]);
	});

	it('warns and skips output when a theme-declared EXML file is missing', async () => {
		const warning = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const { ctx, outputDir } = await createFixtureContext('missing-declared', 'development');

		await compileExml().apply(ctx);

		expect(warning).toHaveBeenCalledWith(
			'resource/default.thm.json: Theme-declared EXML file was not found: resource/skins/MissingSkin.exml',
		);
		expect(ctx.diagnostics.all()).toEqual([
			expect.objectContaining({
				code: DIAGNOSTIC_CODES.EXML_DECLARED_FILE_NOT_FOUND,
				severity: 'warning',
			}),
		]);
		expect(ctx.outputs.skinsScript).toBeUndefined();
		await expect(fs.access(path.join(outputDir, 'resource/default.thm.json'))).rejects.toThrow();
	});

	it('rejects a missing declared EXML file in strict mode', async () => {
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const { ctx } = await createFixtureContext('missing-declared', 'development', true);

		await expect(compileExml().apply(ctx)).rejects.toThrow('EXML input validation failed.');
		expect(ctx.diagnostics.all()[0]).toEqual(
			expect.objectContaining({
				code: DIAGNOSTIC_CODES.EXML_DECLARED_FILE_NOT_FOUND,
				severity: 'error',
			}),
		);
	});

	it('warns and skips EXML output when the configured theme file is missing', async () => {
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const { ctx } = await createFixtureContext('missing-theme', 'development');

		await compileExml().apply(ctx);

		expect(ctx.diagnostics.all()).toEqual([
			expect.objectContaining({
				code: DIAGNOSTIC_CODES.THEME_FILE_NOT_FOUND,
				severity: 'warning',
			}),
		]);
		expect(ctx.outputs.skinsScript).toBeUndefined();
	});

	it('rejects a missing theme in strict and release builds', async () => {
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const strict = await createFixtureContext('missing-theme', 'development', true);
		const release = await createFixtureContext('missing-theme', 'release');

		await expect(compileExml().apply(strict.ctx)).rejects.toThrow('EXML input validation failed.');
		await expect(compileExml().apply(release.ctx)).rejects.toThrow('EXML input validation failed.');
		expect(strict.ctx.diagnostics.all()[0]?.severity).toBe('error');
		expect(release.ctx.strict).toBe(true);
		expect(release.ctx.diagnostics.all()[0]?.severity).toBe('error');
	});

	it('rejects invalid theme JSON with a distinct error diagnostic', async () => {
		vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		const { ctx } = await createFixtureContext('invalid-theme', 'development');

		await expect(compileExml().apply(ctx)).rejects.toThrow('EXML input validation failed.');
		expect(ctx.diagnostics.all()).toEqual([
			expect.objectContaining({
				code: DIAGNOSTIC_CODES.THEME_INVALID_JSON,
				severity: 'error',
			}),
		]);
	});

	it('warns when a theme skin mapping does not correspond to a compiled EXML file', async () => {
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const { ctx, outputDir } = await createFixtureContext('missing-skin-mapping', 'development');

		await compileExml().apply(ctx);

		expect(ctx.diagnostics.all()).toEqual([
			expect.objectContaining({
				code: DIAGNOSTIC_CODES.THEME_SKIN_NOT_FOUND,
				severity: 'warning',
			}),
		]);
		expect(ctx.outputs.skinsScript).toBe('js/default.thm.js');
		const themeSource = await fs.readFile(path.join(outputDir, 'resource/default.thm.json'), 'utf-8');
		const theme = JSON.parse(themeSource) as { skins: Record<string, string> };
		expect(theme.skins['kurot.ui.Button']).toBe('resource/skins/MissingSkin.exml');
	});

	it('rejects an uncompiled theme skin mapping in strict mode before writing output', async () => {
		vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
		const { ctx, outputDir } = await createFixtureContext('missing-skin-mapping', 'development', true);

		await expect(compileExml().apply(ctx)).rejects.toThrow('EXML input validation failed.');
		expect(ctx.diagnostics.all()[0]).toEqual(
			expect.objectContaining({
				code: DIAGNOSTIC_CODES.THEME_SKIN_NOT_FOUND,
				severity: 'error',
			}),
		);
		expect(ctx.outputs.skinsScript).toBeUndefined();
		await expect(fs.access(path.join(outputDir, 'resource/default.thm.json'))).rejects.toThrow();
	});
});

async function createFixtureContext(
	fixtureName: string, mode: BuildMode, strict?: boolean,
): Promise<{ ctx: ReturnType<typeof createContext>; outputDir: string }> {
	const root = path.join(fixturesDir, fixtureName);
	const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), `kurot-cli-${fixtureName}-`));
	temporaryDirs.push(outputDir);
	return { ctx: createProjectContext(root, outputDir, mode, strict), outputDir };
}

async function createMutableFixtureContext(
	fixtureName: string,
): Promise<{ ctx: ReturnType<typeof createContext>; outputDir: string; root: string }> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), `kurot-cli-mutable-${fixtureName}-`));
	temporaryDirs.push(root);
	await fs.cp(path.join(fixturesDir, fixtureName), root, { recursive: true });
	const outputDir = path.join(root, 'bin-debug');
	return { ctx: createProjectContext(root, outputDir, 'development', false), outputDir, root };
}

function createProjectContext(
	root: string,
	outputDir: string,
	mode: BuildMode,
	strict?: boolean,
): ReturnType<typeof createContext> {
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

	return createContext(project, { strict });
}
