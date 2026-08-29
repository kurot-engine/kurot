import * as esbuild from 'esbuild';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ensureDir } from '../../utils/fs.js';
import { logger } from '../../utils/logger.js';
import { namespaceModuleExternalPlugin, normalizeModuleKey } from '../namespace-external-plugin.js';
import type { BuildContext, BuildPlugin } from '../pipeline.js';
import type { CustomNamespace, Project } from '../project.js';

interface BundleResult {
	/**
	 * Output chunk filename relative to `js/`.
	 */
	readonly chunk: string;
	/**
	 * Absolute paths of every source file inlined by the chunk.
	 */
	readonly inputs: readonly string[];
}

interface NamespaceEntry {
	readonly entry: string;
	readonly dispose?: () => Promise<void>;
}

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
			const namespaces = project.customNamespaces.filter(
				namespace => namespace.entry || (namespace.components?.length ?? 0) > 0 || ctx.watch,
			);
			if (namespaces.length === 0) return;

			const jsDir = path.join(project.outputDir, 'js');
			await ensureDir(jsDir);

			for (const ns of namespaces) {
				const generated = await createNamespaceEntry(ns);
				if (!ns.entry) {
					ctx.outputs.namespaceEntries.set(ns.specifier, generated.entry);
				}
				try {
					const { chunk, inputs } = await bundleNamespace(project, ns, generated.entry, jsDir, ctx);
					ctx.outputs.engine[ns.specifier] = `js/${chunk}`;
					registerNamespaceInputs(ctx, ns, inputs);
					if (ctx.watch && generated.dispose) {
						ctx.disposers.push(generated.dispose);
					}
				} finally {
					if (!ctx.watch) {
						await generated.dispose?.();
					}
				}
			}

			logger.step(`bundled ${namespaces.length} custom namespace chunk(s) → js/`);
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

/**
 * Bundles a single namespace barrel (its entry is already an absolute file).
 */
async function bundleNamespace(
	project: Project,
	ns: CustomNamespace,
	entry: string,
	jsDir: string,
	ctx: BuildContext,
): Promise<BundleResult> {
	const base = chunkBaseName(ns.prefix);
	const minify = project.mode === 'release';
	const options: esbuild.BuildOptions = {
		absWorkingDir: project.root,
		entryPoints: { [base]: entry },
		outdir: jsDir,
		entryNames: minify ? '[name].min_[hash]' : '[name]',
		bundle: true,
		format: 'esm',
		platform: 'browser',
		target: 'es2022',
		minify,
		// Convention-based Theme mappings use the exported component class name.
		keepNames: minify,
		metafile: true,
		logLevel: 'warning',
		external: externalFor(project, ns),
		// Catches a barrel importing a *different* namespace's module by relative
		// path (rather than its virtual specifier) — same rewrite as in compile-source.ts.
		// Only namespaces bundled *before* this one have entries in `namespaceModules`
		// yet. Supported namespace barrels are independent, and self-references are
		// excluded by construction (a namespace's own files aren't in the map when
		// bundling that same namespace — see the loop in `compileCustomNamespaces`).
		plugins: [namespaceModuleExternalPlugin(ctx.outputs.namespaceModules)],
	};

	if (ctx.watch) {
		const context = await esbuild.context(options);
		const result = await context.rebuild();
		await context.watch();
		ctx.outputs.namespaceRebuilders.set(ns.specifier, async () => {
			const rebuilt = toBundleResult(project, await context.rebuild(), base);
			registerNamespaceInputs(ctx, ns, rebuilt.inputs);
		});
		ctx.disposers.push(() => context.dispose());
		return toBundleResult(project, result, base);
	}

	const result = await esbuild.build(options);
	return toBundleResult(project, result, base);
}

async function createNamespaceEntry(namespace: CustomNamespace): Promise<NamespaceEntry> {
	if (namespace.entry) return { entry: namespace.entry };
	const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), `kurot-ns-${namespace.prefix}-`));
	const entry = path.join(temporaryRoot, 'index.ts');
	await fs.writeFile(entry, namespaceEntrySource(namespace));
	return {
		entry,
		dispose: () => fs.rm(temporaryRoot, { recursive: true, force: true }),
	};
}

/**
 * Rewrites generated namespace entries and rebuilds their esbuild contexts
 * after components are added, removed, or renamed.
 */
export async function refreshGeneratedNamespaceEntries(ctx: BuildContext): Promise<void> {
	for (const namespace of ctx.project.customNamespaces) {
		if (namespace.entry) continue;
		const entry = ctx.outputs.namespaceEntries.get(namespace.specifier);
		if (!entry) continue;
		await fs.writeFile(entry, namespaceEntrySource(namespace));
		await ctx.outputs.namespaceRebuilders.get(namespace.specifier)?.();
	}
}

function namespaceEntrySource(namespace: CustomNamespace): string {
	const source = (namespace.components ?? [])
		.map(component => `export { ${component.name} } from ${JSON.stringify(component.source)};`)
		.join('\n');
	return source ? `${source}\n` : 'export {};\n';
}

function registerNamespaceInputs(ctx: BuildContext, namespace: CustomNamespace, inputs: readonly string[]): void {
	for (const [module, specifier] of ctx.outputs.namespaceModules) {
		if (specifier === namespace.specifier) {
			ctx.outputs.namespaceModules.delete(module);
		}
	}
	for (const input of inputs) {
		ctx.outputs.namespaceModules.set(normalizeModuleKey(input), namespace.specifier);
	}
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
