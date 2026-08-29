import * as path from 'node:path';
import * as fs from 'node:fs';
import { loadConfig } from './config.js';
import { discoverComponents } from './components/discover-components.js';
import { ConfigError } from './errors.js';
import type { ProjectConfig } from './config.js';

/**
 * Output mode used to resolve a project and its build paths.
 */
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
	 * Absolute path to a user-maintained barrel file. Convention-based component
	 * namespaces omit this and receive a generated entry during compilation.
	 */
	readonly entry?: string;
	/**
	 * Components exported by a generated namespace entry.
	 */
	readonly components?: readonly ProjectComponent[];
}

/**
 * Resolved directories for convention-based reusable UI components.
 */
export interface ComponentConvention {
	/**
	 * XML namespace prefix used by component tags.
	 */
	readonly prefix: string;
	/**
	 * Virtual module specifier shared by compiled skins and application code.
	 */
	readonly specifier: string;
	/**
	 * Absolute directory containing component TypeScript sources.
	 */
	readonly sourceDir: string;
	/**
	 * Absolute directory containing paired component skins.
	 */
	readonly skinDir: string;
}

/**
 * A reusable component source paired with its standard EUI skin.
 */
export interface ProjectComponent {
	/**
	 * Exported component class name.
	 */
	readonly name: string;
	/**
	 * Complete EXML tag, including the configured namespace prefix.
	 */
	readonly tag: string;
	/**
	 * XML namespace prefix used by the component tag.
	 */
	readonly namespace: string;
	/**
	 * Virtual module specifier that owns the component export.
	 */
	readonly specifier: string;
	/**
	 * Absolute TypeScript source path.
	 */
	readonly source: string;
	/**
	 * POSIX TypeScript source path relative to the project root.
	 */
	readonly sourceRelative: string;
	/**
	 * Absolute EXML skin path.
	 */
	readonly skin: string;
	/**
	 * POSIX EXML skin path relative to the project root.
	 */
	readonly skinRelative: string;
	/**
	 * Skin class declared by the EXML root.
	 */
	readonly skinClass: string;
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
	 * Project-defined EXML namespaces from manual barrels and the generated
	 * reusable-component entry.
	 */
	readonly customNamespaces: CustomNamespace[];
	/**
	 * Resolved convention-based component directories, when configured.
	 */
	readonly componentConvention?: ComponentConvention;
	/**
	 * Validated reusable components discovered from the configured directories.
	 */
	readonly components: ProjectComponent[];
}

const NAMESPACE_SPECIFIER_PREFIX = '#ns/';

/**
 * Base output folder names, used by both build and clean.
 */
export const OUTPUT_DIRS = { development: 'bin-debug', release: 'bin-release' } as const;

/**
 * Loads and resolves the project rooted at the current working directory.
 *
 * @param mode - Build mode to resolve the project for.
 * @returns The resolved project view.
 */
export async function loadProject(mode: BuildMode): Promise<Project> {
	const root = process.cwd();
	const config = await loadConfig();
	const outputDir =
		mode === 'release'
			? path.resolve(root, OUTPUT_DIRS.release, 'web', timestamp())
			: path.resolve(root, config.output.dir);
	const componentConvention = resolveComponentConvention(root, config);
	const components = await discoverComponents(root, componentConvention);
	const customNamespaces = resolveCustomNamespaces(root, config.exml?.namespaces);
	if (componentConvention) {
		if (customNamespaces.some(namespace => namespace.prefix === componentConvention.prefix)) {
			throw new ConfigError(
				`Invalid config: exml.components.namespace '${componentConvention.prefix}' conflicts with exml.namespaces.${componentConvention.prefix}`,
			);
		}
		customNamespaces.push({
			prefix: componentConvention.prefix,
			specifier: componentConvention.specifier,
			components,
		});
	}

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
		customNamespaces,
		componentConvention,
		components,
	};
}

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
 * Resolves the reusable-component convention into absolute project paths.
 *
 * Source files must remain inside `src`, and component skins must remain
 * inside `resource`; paths outside those roots are rejected as invalid config.
 *
 * @returns The resolved convention, or `undefined` when components are not configured.
 * @throws {ConfigError} If either configured directory escapes its required project root.
 */
function resolveComponentConvention(root: string, config: ProjectConfig): ComponentConvention | undefined {
	const components = config.exml?.components;
	if (!components) return undefined;
	const sourceDir = path.resolve(root, components.sourceDir);
	const skinDir = path.resolve(root, components.skinDir);
	if (!isWithin(path.resolve(root, 'src'), sourceDir)) {
		throw new ConfigError('Invalid config: exml.components.sourceDir must be inside the project src directory');
	}
	if (!isWithin(path.resolve(root, 'resource'), skinDir)) {
		throw new ConfigError('Invalid config: exml.components.skinDir must be inside the project resource directory');
	}
	return {
		prefix: components.namespace,
		specifier: `${NAMESPACE_SPECIFIER_PREFIX}${components.namespace}`,
		sourceDir,
		skinDir,
	};
}

function isWithin(directory: string, target: string): boolean {
	const relative = path.relative(directory, target);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
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
