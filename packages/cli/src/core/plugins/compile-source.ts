import * as esbuild from 'esbuild';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { namespaceModuleExternalPlugin, normalizeModuleKey } from '../namespace-external-plugin.js';
import type { Dirent } from 'node:fs';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { Project } from '../project.js';

const COMMON: esbuild.BuildOptions = {
	bundle: true,
	format: 'esm',
	platform: 'browser',
	target: 'es2022',
	logLevel: 'warning',
};

/**
 * Compiles the project source with esbuild using mode-specific output shapes:
 *
 * - **development**: each `src/**\/*.ts` is emitted to a mirrored `.js` path
 *   (`Main.js`, `com/akakata/LoadingUI.js`), preserving directory structure.
 * - **release**: all source is bundled and minified into `js/main.min_<hash>.js`.
 *
 * Engine packages stay external in both modes (resolved by the HTML import map),
 * so engine code is never duplicated into the app output. The entry script path
 * is reported via `ctx.outputs.entryScript`.
 */
export function compileSource(): BuildPlugin {
	return {
		name: 'compile source',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			await ensureDir(project.outputDir);

			return project.mode === 'release' ? buildRelease(ctx) : buildDevelopment(ctx);
		},
	};
}

/**
 * Per-file output preserving the source tree (development).
 */
async function buildDevelopment(ctx: BuildContext): Promise<void> {
	const { project } = ctx;
	const allSources = await collectSources(project.srcDir);
	// Files already bundled into a custom-namespace chunk (compile-custom-namespaces.ts)
	// must not also become their own dev entry point — that would emit a second,
	// distinct copy of the same classes instead of resolving to the shared chunk.
	const sources = allSources.filter(file => !ctx.outputs.namespaceModules.has(normalizeModuleKey(file)));
	const entryPoints = sources.length > 0 ? sources : [project.entry];

	const options: esbuild.BuildOptions = {
		...COMMON,
		entryPoints,
		outdir: project.outputDir,
		outbase: project.srcDir,
		entryNames: '[dir]/[name]',
		chunkNames: 'js/chunks/[name]-[hash]',
		splitting: true,
		sourcemap: ctx.sourcemap,
		external: [...project.enginePackages, ...project.customNamespaces.map(ns => ns.specifier)],
		plugins: [namespaceModuleExternalPlugin(ctx.outputs.namespaceModules)],
		define: defines(false),
	};

	ctx.outputs.entryScript = toOutputPath(project, project.entry);

	if (ctx.watch) {
		const context = await esbuild.context(options);
		await context.watch();
		ctx.disposers.push(() => context.dispose());
		return;
	}
	await esbuild.build(options);
}

/**
 * Single minified, content-hashed bundle under `js/` (release).
 */
async function buildRelease(ctx: BuildContext): Promise<void> {
	const { project } = ctx;
	const result = await esbuild.build({
		...COMMON,
		entryPoints: [project.entry],
		outdir: path.join(project.outputDir, 'js'),
		entryNames: 'main.min_[hash]',
		minify: true,
		// Component.hostComponentKey defaults to constructor.name.
		keepNames: true,
		sourcemap: ctx.sourcemap,
		metafile: true,
		external: [...project.enginePackages, ...project.customNamespaces.map(ns => ns.specifier)],
		plugins: [namespaceModuleExternalPlugin(ctx.outputs.namespaceModules)],
		define: defines(true),
	});

	const output = Object.keys(result.metafile!.outputs).find(f => f.endsWith('.js'));
	ctx.outputs.entryScript = output ? `js/${path.basename(output)}` : 'js/main.min.js';

	if (ctx.analyze) {
		logger.info('Bundle analysis:\n' + (await esbuild.analyzeMetafile(result.metafile!)));
	}
}

/**
 * Build-time `define` replacements for `process.env.DEBUG`/`process.env.RELEASE`.
 */
function defines(isRelease: boolean): Record<string, string> {
	return {
		'process.env.DEBUG': JSON.stringify(!isRelease),
		'process.env.RELEASE': JSON.stringify(isRelease),
	};
}

/**
 * Maps an absolute source path to its output path, relative to the output dir.
 */
function toOutputPath(project: Project, sourceFile: string): string {
	return path.relative(project.srcDir, sourceFile).replace(/\.ts$/, '.js').split(path.sep).join('/');
}

/**
 * Collects every `.ts` source (excluding `.d.ts`) under the source directory.
 */
async function collectSources(srcDir: string): Promise<string[]> {
	const results: string[] = [];

	async function walk(dir: string): Promise<void> {
		let entries: Dirent[];
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
			} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
				results.push(full);
			}
		}
	}

	await walk(srcDir);
	return results.sort();
}
