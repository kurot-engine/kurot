import { logger } from '../utils/logger.js';
import { DiagnosticCollector } from './diagnostics/index.js';
import { BuildError } from './errors.js';
import type { Project } from './project.js';

/**
 * Shared state threaded through every build plugin.
 *
 * Plugins read the immutable `project` and `options`, and communicate results
 * to later plugins through `outputs` (e.g. the source compiler reports the
 * generated entry script name so the HTML generator can reference it).
 */
export interface BuildContext {
	readonly project: Project;
	readonly sourcemap: boolean;
	readonly analyze: boolean;
	readonly watch: boolean;
	/**
	 * Whether strict policy promotes selected warnings to errors.
	 */
	readonly strict: boolean;
	/**
	 * Diagnostics reported by build plugins.
	 */
	readonly diagnostics: DiagnosticCollector;
	/**
	 * Artifacts produced during the build, populated incrementally by plugins.
	 */
	readonly outputs: {
		/**
		 * Entry script path, relative to the output dir (e.g. `Main.js`, `js/main.min_ab12.js`).
		 */
		entryScript?: string;
		/**
		 * Compiled skins module path, relative to the output dir (e.g. `js/default.thm.js`).
		 */
		skinsScript?: string;
		/**
		 * Engine import-map: package specifier → chunk path relative to output dir.
		 */
		engine: Record<string, string>;
		/**
		 * Every source file bundled into a custom-namespace chunk (see
		 * `compile-custom-namespaces.ts`), keyed by its extensionless absolute
		 * path (see `normalizeModuleKey` in `namespace-external-plugin.ts`) and
		 * mapped to that namespace's virtual specifier (e.g. `#ns/game`).
		 *
		 * Populated from esbuild's `metafile.outputs[x].inputs` — the exact set
		 * of files a chunk inlined, not a guess. Two consumers rely on this:
		 * `compile-source.ts` excludes these files from its per-file dev output
		 * (re-emitting them as separate entry points would bundle a second,
		 * distinct copy of the same classes), and `namespaceModuleExternalPlugin`
		 * rewrites any import resolving to one of these paths — even a relative
		 * import that bypasses the namespace's barrel file — to the matching
		 * specifier instead of inlining it.
		 */
		namespaceModules: Map<string, string>;
	};
	/**
	 * Cleanup callbacks registered by long-lived plugins (watchers, contexts).
	 */
	readonly disposers: Array<() => Promise<void> | void>;
}

/**
 * A single, named step in the build pipeline.
 */
export interface BuildPlugin {
	readonly name: string;
	apply(ctx: BuildContext): Promise<void>;
}

/**
 * Creates a fresh build context for a project.
 */
export function createContext(
	project: Project,
	options: { sourcemap?: boolean; analyze?: boolean; watch?: boolean; strict?: boolean } = {},
): BuildContext {
	const strict = options.strict ?? project.mode === 'release';
	return {
		project,
		sourcemap: options.sourcemap ?? false,
		analyze: options.analyze ?? false,
		watch: options.watch ?? false,
		strict,
		diagnostics: new DiagnosticCollector({ strict }),
		outputs: { engine: {}, namespaceModules: new Map() },
		disposers: [],
	};
}

/**
 * Runs plugins in order, logging each step.
 */
export async function runPipeline(ctx: BuildContext, plugins: readonly BuildPlugin[]): Promise<void> {
	for (const plugin of plugins) {
		logger.step(plugin.name);
		await plugin.apply(ctx);
		if (ctx.diagnostics.hasErrors()) {
			const count = ctx.diagnostics.all().filter(diagnostic => diagnostic.severity === 'error').length;
			throw new BuildError(`Build stopped after '${plugin.name}' with ${count} error diagnostic(s).`);
		}
	}
}

/**
 * Invokes every registered disposer, ignoring individual failures.
 */
export async function disposeContext(ctx: BuildContext): Promise<void> {
	await Promise.allSettled(ctx.disposers.map(dispose => dispose()));
}
