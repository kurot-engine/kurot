import { logger } from '../utils/logger.js';
import { DiagnosticCollector } from './diagnostics/index.js';
import { BuildError } from './errors.js';
import type { Project } from './project.js';

/**
 * Artifacts and namespace state populated incrementally by build plugins.
 */
export interface BuildOutputs {
	/**
	 * Entry script path relative to the output directory.
	 */
	entryScript?: string;
	/**
	 * Compiled skins module path relative to the output directory.
	 */
	skinsScript?: string;
	/**
	 * Component catalog path relative to the development output directory.
	 */
	componentCatalog?: string;
	/**
	 * Import-map entries from module specifiers to output-relative chunk paths.
	 */
	engine: Record<string, string>;
	/**
	 * Source modules already owned by namespace bundles.
	 *
	 * Keys are normalized, extensionless absolute paths. Values are virtual
	 * namespace specifiers. Source compilation uses the map to preserve a single
	 * class identity when relative imports bypass a namespace entry.
	 */
	namespaceModules: Map<string, string>;
	/**
	 * Generated entry sources for convention-based component namespaces.
	 */
	namespaceEntries: Map<string, string>;
	/**
	 * Namespace rebuild callbacks used when component membership changes.
	 */
	namespaceRebuilders: Map<string, () => Promise<void>>;
}

/**
 * Options used to create a build context.
 */
export interface BuildContextOptions {
	readonly sourcemap?: boolean;
	readonly analyze?: boolean;
	readonly watch?: boolean;
	readonly strict?: boolean;
}

/**
 * Shared state threaded through every build plugin.
 *
 * Plugins treat `project` and build flags as immutable and communicate with
 * later steps through `outputs`.
 */
export interface BuildContext {
	readonly project: Project;
	/**
	 * Whether application bundles include source maps.
	 */
	readonly sourcemap: boolean;
	/**
	 * Whether release compilation prints bundle analysis.
	 */
	readonly analyze: boolean;
	/**
	 * Whether long-lived compiler contexts watch for source changes.
	 */
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
	readonly outputs: BuildOutputs;
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
	options: BuildContextOptions = {},
): BuildContext {
	const strict = options.strict ?? project.mode === 'release';
	return {
		project,
		sourcemap: options.sourcemap ?? false,
		analyze: options.analyze ?? false,
		watch: options.watch ?? false,
		strict,
		diagnostics: new DiagnosticCollector({ strict }),
		outputs: {
			engine: {},
			namespaceModules: new Map(),
			namespaceEntries: new Map(),
			namespaceRebuilders: new Map(),
		},
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
