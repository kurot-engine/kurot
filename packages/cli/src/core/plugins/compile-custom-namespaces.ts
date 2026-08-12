import * as esbuild from 'esbuild';
import * as path from 'node:path';
import { ensureDir } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { namespaceModuleExternalPlugin, normalizeModuleKey } from '../namespace-external-plugin.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { CustomNamespace, Project } from '../project.js';

/**
 * Bundles each project-defined EXML namespace (`exml.namespaces` in
 * `kurot.config.ts`, matching Egret's `xmlns:game="game.*"` convention)
 * into its own chunk under `js/`.
 *
 * A namespace barrel (e.g. `src/ui/index.ts` re-exporting `HeroNarrowIR`,
 * etc.) is compiled exactly once and wired into the page via the same import
 * map used for `@kurot/*` engine chunks (see `compile-engine.ts`). Both the
 * app bundle (`compile-source.ts`) and the compiled skins bundle
 * (`compile-exml.ts`) mark the namespace specifier as external, so a class
 * referenced from EXML and from game code resolves to the same module
 * instance — never two copies with mismatched `instanceof` identity.
 *
 * In watch mode each barrel is rebuilt on change; the browser still needs a
 * manual refresh to pick up the new chunk, matching the rest of `kurot dev`.
 */
export function compileCustomNamespaces(): BuildPlugin {
	return {
		name: 'compile custom namespaces',
		async apply(ctx: BuildContext): Promise<void> {
			const { project } = ctx;
			if (project.customNamespaces.length === 0) return;

			const jsDir = path.join(project.outputDir, 'js');
			await ensureDir(jsDir);

			for (const ns of project.customNamespaces) {
				const { chunk, inputs } = await bundleNamespace(project, ns, jsDir, ctx);
				ctx.outputs.engine[ns.specifier] = `js/${chunk}`;
				for (const input of inputs) ctx.outputs.namespaceModules.set(normalizeModuleKey(input), ns.specifier);
			}

			logger.step(`bundled ${project.customNamespaces.length} custom namespace chunk(s) → js/`);
		},
	};
}

/**
 * External specifiers a namespace chunk must not inline: engine packages and
 * every other namespace.
 */
function externalFor(project: Project, ns: CustomNamespace): string[] {
	return [...project.enginePackages, ...project.customNamespaces.filter(n => n !== ns).map(n => n.specifier)];
}

interface BundleResult {
	/**
	 * Output chunk filename, relative to `js/`.
	 */
	chunk: string;
	/**
	 * Absolute paths of every source file this chunk inlined.
	 */
	inputs: string[];
}

/**
 * Bundles a single namespace barrel (its entry is already an absolute file).
 */
async function bundleNamespace(
	project: Project,
	ns: CustomNamespace,
	jsDir: string,
	ctx: BuildContext,
): Promise<BundleResult> {
	const base = chunkBaseName(ns.prefix);
	const minify = project.mode === 'release';
	const options: esbuild.BuildOptions = {
		absWorkingDir: project.root,
		entryPoints: { [base]: ns.entry },
		outdir: jsDir,
		entryNames: minify ? '[name].min_[hash]' : '[name]',
		bundle: true,
		format: 'esm',
		platform: 'browser',
		target: 'es2022',
		minify,
		metafile: true,
		logLevel: 'warning',
		external: externalFor(project, ns),
		// Catches a barrel importing a *different* namespace's module by relative
		// path (rather than its virtual specifier) — same rewrite as in compile-source.ts.
		// Only namespaces bundled *before* this one have entries in `namespaceModules`
		// yet, which is fine: namespaces don't import each other in the supported
		// migration pattern (independent barrels), and self-references are already
		// excluded by construction (a namespace's own files aren't in the map when
		// bundling that same namespace — see the loop in `compileCustomNamespaces`).
		plugins: [namespaceModuleExternalPlugin(ctx.outputs.namespaceModules)],
	};

	if (ctx.watch) {
		const context = await esbuild.context(options);
		const result = await context.rebuild();
		await context.watch();
		ctx.disposers.push(() => context.dispose());
		return toBundleResult(project, result, base);
	}

	const result = await esbuild.build(options);
	return toBundleResult(project, result, base);
}

/**
 * Extracts the output chunk filename and every source file it inlined from
 * an esbuild result's metafile.
 */
function toBundleResult(project: Project, result: esbuild.BuildResult, base: string): BundleResult {
	const outputs = result.metafile!.outputs;
	const outputPath = Object.keys(outputs).find(f => f.endsWith('.js'));
	const inputs = outputPath
		? Object.keys(outputs[outputPath].inputs).map(input => path.resolve(project.root, input))
		: [];
	return { chunk: path.basename(outputPath ?? `${base}.js`), inputs };
}

/**
 * `game` → `ns.game` (kept distinct from `@kurot/*` engine chunk names).
 */
function chunkBaseName(prefix: string): string {
	return `ns.${prefix}`;
}
