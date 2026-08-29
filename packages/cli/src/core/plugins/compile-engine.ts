import * as esbuild from 'esbuild';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureDir } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { Project } from '../project.js';

/**
 * Bundles each `@kurot/*` engine package into its own chunk under `js/`,
 * externalizing the other engine packages so code is never duplicated.
 *
 * The resulting chunks are wired into the page through an import map (see
 * `generate-html`), so browser-side bare specifiers resolve to shared chunks.
 *
 * Engine chunks change rarely, so in release mode they carry a content hash for
 * long-term caching.
 */
export function compileEngine(): BuildPlugin {
	return {
		name: 'compile engine',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			if (project.enginePackages.length === 0) return;

			const jsDir = path.join(project.outputDir, 'js');
			await ensureDir(jsDir);

			// Stub entry files (`export * from '<pkg>'`) keep package resolution
			// and output naming under our control. They live inside the project's
			// node_modules so esbuild resolves engine packages correctly.
			const stubDir = await fs.mkdtemp(path.join(project.root, 'node_modules', '.kurot-engine-'));
			try {
				for (const pkg of project.enginePackages) {
					const chunk = await bundlePackage(project, pkg, stubDir, jsDir, project.mode === 'release');
					ctx.outputs.engine[pkg] = `js/${chunk}`;
				}
			} finally {
				await fs.rm(stubDir, { recursive: true, force: true });
			}

			logger.step(`bundled ${project.enginePackages.length} engine chunk(s) → js/`);
		},
	};
}

/**
 * Bundles a single engine package, returning its output filename.
 */
async function bundlePackage(
	project: Project,
	pkg: string,
	stubDir: string,
	jsDir: string,
	minify: boolean,
): Promise<string> {
	const base = chunkBaseName(pkg);
	const stub = path.join(stubDir, `${base}.ts`);
	await fs.writeFile(stub, `export * from '${pkg}';\n`);

	const result = await esbuild.build({
		absWorkingDir: project.root,
		entryPoints: [stub],
		outdir: jsDir,
		entryNames: minify ? '[name].min_[hash]' : '[name]',
		bundle: true,
		format: 'esm',
		platform: 'browser',
		target: 'es2022',
		minify,
		// Theme resolves default skins by constructor.name; release minification
		// must preserve that runtime contract.
		keepNames: minify,
		metafile: true,
		logLevel: 'warning',
		external: project.enginePackages.filter(p => p !== pkg),
	});

	const output = Object.keys(result.metafile!.outputs).find(f => f.endsWith('.js'));
	return path.basename(output ?? `${base}.js`);
}

/**
 * `@kurot/core` → `kurot.core`.
 */
export function chunkBaseName(pkg: string): string {
	return pkg.replace(/^@/, '').replace(/\//g, '.');
}
