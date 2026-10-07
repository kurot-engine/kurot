import { parseUIResourceConfigEntries, parseUIStyleSheet } from '@kurot/ui-document';
import type { UIResourceConfigEntry, UIStyleSheet } from '@kurot/ui-document';
import * as esbuild from 'esbuild';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ensureDir } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { DIAGNOSTIC_CODES } from '../diagnostics/index.js';
import { BuildError } from '../errors.js';
import { createUnresolvedTagDiagnostics } from './kui-diagnostics.js';
import { generateCode, parseToIR } from './index.js';
import type { Diagnostic } from '../diagnostics/index.js';
import type { BuildContext } from '../pipeline.js';
import type { SkinIR } from './ast.js';

/**
 * KUI source file resolved for skin compilation.
 */
export interface KUIFile {
	/**
	 * Absolute source path.
	 */
	readonly path: string;
	/**
	 * POSIX path relative to the project's resource directory.
	 */
	readonly relPath: string;
	/**
	 * UTF-8 KUI source text.
	 */
	readonly contents: string;
}

/**
 * KUI source paired with its declared skin class name.
 */
export interface CompiledSkin {
	readonly file: KUIFile;
	/**
	 * Complete class name used for global factory registration.
	 */
	readonly className: string;
}

/**
 * Installed skin bundle and the parsed skins used to build it.
 */
export interface BuiltSkinsModule {
	readonly filename: string;
	readonly skins: readonly SkinIR[];
}

/**
 * Builds and atomically installs the ESM bundle for a set of KUI skins.
 *
 * @returns The installed bundle filename and the parsed skins used to build it.
 */
export async function buildSkinsModule(ctx: BuildContext, skins: readonly CompiledSkin[]): Promise<BuiltSkinsModule> {
	const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-skins-'));
	try {
		const manifestPath = path.join(ctx.project.resourceDir, 'default.res.json');
		let resources: readonly UIResourceConfigEntry[] = [];
		try {
			resources = parseUIResourceConfigEntries(JSON.parse(await fs.readFile(manifestPath, 'utf8')));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				throw new BuildError(
					`Resource configuration failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
		let styleSheet: UIStyleSheet | undefined;
		try {
			const source = await fs.readFile(path.join(ctx.project.resourceDir, 'config/style.json'), 'utf8');
			styleSheet = parseUIStyleSheet(JSON.parse(source));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				throw new BuildError(
					`resource/config/style.json: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
		const modules = await Promise.all(skins.map(skin => generateSkinModule(ctx, skin, resources, styleSheet)));
		if (modules.some(module => module === undefined) || ctx.diagnostics.hasErrors()) {
			throw new BuildError('KUI compilation failed.');
		}

		const compiledModules = modules.filter(
			(module): module is { source: string; skin: SkinIR } => module !== undefined,
		);
		const stubDir = path.join(temporaryRoot, 'stubs');
		const bundleDir = path.join(temporaryRoot, 'bundle');
		await Promise.all([ensureDir(stubDir), ensureDir(bundleDir)]);
		await Promise.all(
			compiledModules.map((module, index) => fs.writeFile(path.join(stubDir, `skin${index}.ts`), module.source)),
		);
		await fs.writeFile(path.join(stubDir, 'index.ts'), createIndex(skins) + '\n');

		const outputName = await bundleSkins(ctx, stubDir, bundleDir);
		await installBundle(bundleDir, outputName, path.join(ctx.project.outputDir, 'js'));
		return {
			filename: outputName,
			skins: compiledModules.map(module => module.skin),
		};
	} finally {
		await fs.rm(temporaryRoot, { recursive: true, force: true });
	}
}

/**
 * Parses one Skin and reports diagnostics before generating its factory.
 */
async function generateSkinModule(
	ctx: BuildContext,
	skin: CompiledSkin,
	resources: readonly UIResourceConfigEntry[],
	styleSheet: UIStyleSheet | undefined,
): Promise<{ source: string; skin: SkinIR } | undefined> {
	try {
		const namespaces = ctx.project.customNamespaces.map(ns => ({
			prefix: ns.prefix,
			specifier: ns.specifier,
			...(ns.components ? { componentNames: new Set(ns.components.map(component => component.name)) } : {}),
		}));
		const ir = parseToIR(
			skin.file.contents,
			skin.className,
			namespaces,
			resources,
			styleSheet?.colors ?? {},
			styleSheet,
		);
		const diagnostics = createUnresolvedTagDiagnostics(
			skin.file.relPath,
			skin.file.contents,
			ir.unresolvedTags,
			namespaces,
		);
		for (const diagnostic of diagnostics) {
			ctx.diagnostics.report(diagnostic);
			logger.warn(`${diagnostic.location?.file}: ${diagnostic.message}`);
		}
		return {
			source: generateCode(ir, { format: 'esm' }),
			skin: ir,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const diagnostic: Diagnostic = {
			code: DIAGNOSTIC_CODES.KUI_COMPILE_FAILED,
			severity: 'error',
			message: `KUI compile failed: ${message}`,
			location: { file: skin.file.relPath },
		};
		ctx.diagnostics.report(diagnostic);
		logger.error(`${skin.file.relPath}: ${diagnostic.message}`);
		return undefined;
	}
}

/**
 * Registers generated Skin factories under their complete class names.
 */
function createIndex(skins: readonly CompiledSkin[]): string {
	return skins
		.map((skin, index) => {
			const functionName = factoryName(skin.className);
			return (
				`import { ${functionName} as s${index} } from './skin${index}.js';\n` +
				`globalThis[${JSON.stringify(skin.className)}] = s${index};`
			);
		})
		.join('\n\n');
}

/**
 * Bundles Skin factories while keeping engine and namespace modules external.
 */
async function bundleSkins(ctx: BuildContext, stubDir: string, bundleDir: string): Promise<string> {
	const { project } = ctx;
	const isRelease = project.mode === 'release';
	const engineExternal = project.enginePackages.length > 0 ? project.enginePackages : ['@kurot/ui', '@kurot/core'];
	const result = await esbuild.build({
		entryPoints: [path.join(stubDir, 'index.ts')],
		outdir: bundleDir,
		entryNames: isRelease ? 'default.thm.min_[hash]' : 'default.thm',
		bundle: true,
		format: 'esm',
		platform: 'browser',
		target: 'es2022',
		minify: isRelease,
		metafile: true,
		logLevel: 'warning',
		external: [...engineExternal, ...project.customNamespaces.map(ns => ns.specifier)],
	});
	const output = Object.keys(result.metafile!.outputs).find(file => file.endsWith('.js'));

	return path.basename(output ?? 'default.thm.js');
}

/**
 * Stages and renames the completed bundle into the output directory.
 */
async function installBundle(bundleDir: string, outputName: string, destinationDir: string): Promise<void> {
	await ensureDir(destinationDir);

	const stagingDir = await fs.mkdtemp(path.join(destinationDir, '.kurot-skins-'));

	try {
		const stagedFile = path.join(stagingDir, outputName);
		await fs.copyFile(path.join(bundleDir, outputName), stagedFile);
		await fs.rename(stagedFile, path.join(destinationDir, outputName));
	} finally {
		await fs.rm(stagingDir, { recursive: true, force: true });
	}
}

/**
 * Derives the factory identifier used by the generated registration module.
 */
function factoryName(className: string): string {
	const base = (className.split('.').pop() ?? 'Skin').replace(/[^A-Za-z0-9_$]/g, '_');
	return `create${base}`;
}
