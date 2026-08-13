import * as esbuild from 'esbuild';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ensureDir } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { DIAGNOSTIC_CODES } from '../diagnostics/index.js';
import { BuildError } from '../errors.js';
import { createUnresolvedTagDiagnostics } from './exml-diagnostics.js';
import { generateCode, parseToIR } from './index.js';
import type { Diagnostic } from '../diagnostics/index.js';
import type { BuildContext } from '../pipeline.js';

/**
 * EXML source file resolved for skin compilation.
 */
export interface ExmlFile {
	readonly path: string;
	readonly relPath: string;
	readonly contents: string;
}

/**
 * EXML source paired with its declared skin class name.
 */
export interface CompiledSkin {
	readonly file: ExmlFile;
	readonly className: string;
}

/**
 * Builds and atomically installs the ESM bundle for a set of EXML skins.
 */
export async function buildSkinsModule(ctx: BuildContext, skins: readonly CompiledSkin[]): Promise<string> {
	const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-skins-'));
	try {
		const modules = await Promise.all(skins.map(skin => generateSkinModule(ctx, skin)));
		if (modules.some(module => module === undefined) || ctx.diagnostics.hasErrors()) {
			throw new BuildError('EXML compilation failed.');
		}

		const sources = modules.filter((module): module is string => module !== undefined);
		const stubDir = path.join(temporaryRoot, 'stubs');
		const bundleDir = path.join(temporaryRoot, 'bundle');
		await Promise.all([ensureDir(stubDir), ensureDir(bundleDir)]);
		await Promise.all(sources.map((source, index) => fs.writeFile(path.join(stubDir, `skin${index}.ts`), source)));
		await fs.writeFile(path.join(stubDir, 'index.ts'), createIndex(skins) + '\n');

		const outputName = await bundleSkins(ctx, stubDir, bundleDir);
		await installBundle(bundleDir, outputName, path.join(ctx.project.outputDir, 'js'));
		return outputName;
	} finally {
		await fs.rm(temporaryRoot, { recursive: true, force: true });
	}
}

async function generateSkinModule(ctx: BuildContext, skin: CompiledSkin): Promise<string | undefined> {
	try {
		const namespaces = ctx.project.customNamespaces.map(ns => ({ prefix: ns.prefix, specifier: ns.specifier }));
		const ir = parseToIR(skin.file.contents, skin.className, namespaces);
		const diagnostics = createUnresolvedTagDiagnostics(skin.file.relPath, skin.file.contents, ir.unresolvedTags);
		for (const diagnostic of diagnostics) {
			ctx.diagnostics.report(diagnostic);
			logger.warn(`${diagnostic.location?.file}: ${diagnostic.message}`);
		}
		return generateCode(ir, { format: 'esm' });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const diagnostic: Diagnostic = {
			code: DIAGNOSTIC_CODES.EXML_COMPILE_FAILED,
			severity: 'error',
			message: `EXML compile failed: ${message}`,
			location: { file: skin.file.relPath },
		};
		ctx.diagnostics.report(diagnostic);
		logger.error(`${skin.file.relPath}: ${diagnostic.message}`);
		return undefined;
	}
}

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

function factoryName(className: string): string {
	return `create${className.split('.').pop()}`;
}
