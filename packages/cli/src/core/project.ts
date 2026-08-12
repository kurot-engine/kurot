import * as path from 'node:path';
import * as fs from 'node:fs';
import { loadConfig, type ProjectConfig } from './config.js';

export type BuildMode = 'development' | 'release';

/**
 * A project-defined EXML namespace (Egret's `xmlns:game="game.*"` convention).
 *
 * `specifier` is the virtual module specifier used in generated `import`
 * statements (e.g. `#ns/game`); it is resolved via an HTML import map to the
 * bundled chunk produced from `entry`, so the app bundle and the skins bundle
 * both import the same module instance.
 */
export interface CustomNamespace {
	/**
	 * The XML namespace prefix (e.g. `game` for `xmlns:game="game.*"`).
	 */
	readonly prefix: string;
	/**
	 * Virtual module specifier used in generated `import` statements.
	 */
	readonly specifier: string;
	/**
	 * Absolute path to the barrel file exporting every class in this namespace.
	 */
	readonly entry: string;
}

/**
 * Resolved view of a Kurot project.
 *
 * Loads `kurot.config.ts`, then resolves every project path to an absolute
 * location so plugins never have to touch `process.cwd()` or `path.resolve`
 * themselves. This is the single source of truth for the build pipeline.
 */
export interface Project {
	/**
	 * Project root (current working directory).
	 */
	readonly root: string;
	/**
	 * Build mode this project view was resolved for.
	 */
	readonly mode: BuildMode;
	/**
	 * Validated user configuration.
	 */
	readonly config: ProjectConfig;
	/**
	 * Absolute path to the entry source file.
	 */
	readonly entry: string;
	/**
	 * Absolute path to the source root directory (`src/`).
	 */
	readonly srcDir: string;
	/**
	 * Absolute output directory.
	 * - development: `bin-debug`
	 * - release: `bin-release/web/<timestamp>` (Egret-style versioned folder)
	 */
	readonly outputDir: string;
	/**
	 * Absolute path to the `resource/` directory.
	 */
	readonly resourceDir: string;
	/**
	 * Absolute path to the project-owned HTML template, when configured.
	 */
	readonly htmlTemplate?: string;
	/**
	 * Absolute path to the theme file, when EXML is enabled.
	 */
	readonly themeFile?: string;
	/**
	 * `@kurot/*` engine packages this project depends on (excluding the CLI).
	 * Each is bundled into its own chunk and wired up via an HTML import map.
	 */
	readonly enginePackages: string[];
	/**
	 * Project-defined EXML namespaces, resolved from `config.exml.namespaces`.
	 */
	readonly customNamespaces: CustomNamespace[];
}

/**
 * Base output folder names, used by both build and clean.
 */
export const OUTPUT_DIRS = { development: 'bin-debug', release: 'bin-release' } as const;

/**
 * Loads and resolves the project rooted at the current working directory.
 *
 * @param mode - The build mode to resolve the project for
 * @returns The resolved project view
 */
export async function loadProject(mode: BuildMode): Promise<Project> {
	const root = process.cwd();
	const config = await loadConfig();
	const outputDir =
		mode === 'release'
			? path.resolve(root, OUTPUT_DIRS.release, 'web', timestamp())
			: path.resolve(root, config.output.dir);

	return {
		root,
		mode,
		config,
		entry: path.resolve(root, config.entry),
		srcDir: path.resolve(root, 'src'),
		outputDir,
		resourceDir: path.resolve(root, 'resource'),
		htmlTemplate: config.html ? path.resolve(root, config.html.template) : undefined,
		themeFile: config.exml ? path.resolve(root, config.exml.themeFile) : undefined,
		enginePackages: detectEnginePackages(root),
		customNamespaces: resolveCustomNamespaces(root, config.exml?.namespaces),
	};
}

/**
 * The specifier prefix used for project-defined EXML namespaces (kept out of
 * npm's `@scope` space).
 */
const NAMESPACE_SPECIFIER_PREFIX = '#ns/';

/**
 * Resolves `config.exml.namespaces` into `CustomNamespace` entries with
 * absolute barrel paths.
 */
function resolveCustomNamespaces(root: string, namespaces: Record<string, string> | undefined): CustomNamespace[] {
	if (!namespaces) return [];
	return Object.entries(namespaces).map(([prefix, entry]) => ({
		prefix,
		specifier: `${NAMESPACE_SPECIFIER_PREFIX}${prefix}`,
		entry: path.resolve(root, entry),
	}));
}

/**
 * Reads `@kurot/*` runtime dependencies (excluding the CLI) from package.json.
 */
function detectEnginePackages(root: string): string[] {
	try {
		const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')) as {
			dependencies?: Record<string, string>;
		};
		return Object.keys(pkg.dependencies ?? {})
			.filter(name => name.startsWith('@kurot/') && name !== '@kurot/cli')
			.sort();
	} catch {
		return [];
	}
}

/**
 * Egret-style `YYMMDDHHmmss` version stamp.
 */
function timestamp(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	return (
		String(d.getFullYear() % 100) +
		p(d.getMonth() + 1) +
		p(d.getDate()) +
		p(d.getHours()) +
		p(d.getMinutes()) +
		p(d.getSeconds())
	);
}
