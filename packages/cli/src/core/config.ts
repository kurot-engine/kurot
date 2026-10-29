import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { exists } from '../utils/fs.js';
import { ConfigError } from './errors.js';

/**
 * Runtime platform targeted by project builds.
 */
export type BuildTarget = 'html5';

export interface StageConfig {
	/**
	 * Stage width in points.
	 */
	readonly width: number;
	/**
	 * Stage height in points.
	 */
	readonly height: number;
	/**
	 * Egret-style scale mode: `showAll` | `noScale` | `exactFit` | `noBorder` |
	 * `fixedHeight` | `fixedWidth` | `fixedNarrow` | `fixedWide`.
	 */
	readonly scaleMode: string;
	/**
	 * Preferred device orientation (e.g. `auto`, `portrait`, `landscape`).
	 */
	readonly orientation: string;
	/**
	 * Target frame rate, in frames per second.
	 */
	readonly frameRate: number;
}

export interface KUIConfig {
	/**
	 * Directory containing `.kui.xml` sources, relative to the project root.
	 */
	readonly sourceDir: string;
	/**
	 * Custom KUI component namespaces mapped to TypeScript barrel files.
	 */
	readonly namespaces?: Readonly<Record<string, string>>;
	/**
	 * Convention-based reusable UI components.
	 *
	 * A component source `<Name>.ts` under `sourceDir` is paired with
	 * `<Name>Skin.kui.xml` at the same relative path under `skinDir`. The CLI
	 * exposes paired components through `namespace` without requiring a
	 * hand-written namespace barrel.
	 */
	readonly components?: ComponentsConfig;
}

export interface ComponentsConfig {
	/**
	 * KUI namespace prefix used to instantiate discovered components.
	 */
	readonly namespace: string;
	/**
	 * Directory containing reusable component TypeScript sources, relative to
	 * the project root.
	 */
	readonly sourceDir: string;
	/**
	 * Directory containing the corresponding component skins, relative to the
	 * project root.
	 */
	readonly skinDir: string;
}

export interface OutputConfig {
	/**
	 * Development build output directory, relative to the project root
	 * (default: `bin-debug`). Release builds always go to
	 * `bin-release/web/<timestamp>` regardless of this setting.
	 */
	readonly dir: string;
	/**
	 * Place release assets in `assets/<content-hash>/` and set the entry page's
	 * base URL to that directory. Defaults to false; ignored in development.
	 */
	readonly versionedAssets?: boolean;
}

export interface HtmlConfig {
	/**
	 * Path to the project-owned HTML template, relative to the project root.
	 * Omit to use the CLI's built-in default template.
	 */
	readonly template: string;
}

export interface ProjectConfig {
	/**
	 * Build target platform. Only `html5` is currently supported.
	 */
	readonly target: BuildTarget;
	/**
	 * Path to the entry source file, relative to the project root
	 * (default: `src/Main.ts`).
	 */
	readonly entry: string;
	/**
	 * Build output settings.
	 */
	readonly output: OutputConfig;
	/**
	 * HTML page template settings. Omit to use the built-in default page.
	 */
	readonly html?: HtmlConfig;
	/**
	 * Stage / canvas configuration.
	 */
	readonly stage: StageConfig;
	/**
	 * KUI compilation settings. Omit to disable authored UI compilation.
	 */
	readonly ui?: KUIConfig;
}

const DEFAULTS: ProjectConfig = {
	target: 'html5',
	entry: 'src/Main.ts',
	output: { dir: 'bin-debug' },
	stage: {
		width: 640,
		height: 1136,
		scaleMode: 'showAll',
		orientation: 'auto',
		frameRate: 60,
	},
};

const VALID_SCALE_MODES = [
	'showAll',
	'noScale',
	'exactFit',
	'noBorder',
	'fixedHeight',
	'fixedWidth',
	'fixedNarrow',
	'fixedWide',
] as const;

let configRevision = 0;

/**
 * Loads and validates `kurot.config.ts` (or `.js`) from the current working
 * directory, merging it over `DEFAULTS`. Falls back to `DEFAULTS` entirely
 * when no config file is present.
 *
 * @param options - Optional project root and fresh root-module evaluation. Imported
 * helpers retain Node module caching; changes to them require restarting dev.
 * @returns The validated project configuration.
 * @throws {ConfigError} If the project configuration is invalid.
 */
export async function loadConfig(options: { root?: string; fresh?: boolean } = {}): Promise<ProjectConfig> {
	const root = options.root ?? process.cwd();
	const configPath = path.resolve(root, 'kurot.config.ts');
	const jsConfigPath = path.resolve(root, 'kurot.config.js');

	let config: ProjectConfig;

	if ((await exists(configPath)) || (await exists(jsConfigPath))) {
		// Dynamic import of `kurot.config.ts` relies on Node's built-in
		// TypeScript type-stripping support (no `tsx`/`ts-node` involved).
		const url = pathToFileURL((await exists(configPath)) ? configPath : jsConfigPath);
		if (options.fresh) {
			url.searchParams.set('kurotConfigRevision', String(++configRevision));
		}
		const mod = await import(url.href);
		const userConfig: ProjectConfig = mod.default ?? mod;
		config = { ...DEFAULTS, ...userConfig, stage: { ...DEFAULTS.stage, ...userConfig.stage } };
	} else {
		config = DEFAULTS;
	}

	if (config.output.versionedAssets !== undefined && typeof config.output.versionedAssets !== 'boolean') {
		throw new ConfigError('Invalid config: output.versionedAssets must be a boolean');
	}

	if (!Number.isInteger(config.stage.frameRate) || config.stage.frameRate <= 0) {
		throw new ConfigError(
			`Invalid config: stage.frameRate must be a positive integer, got ${config.stage.frameRate}`,
		);
	}
	for (const key of ['width', 'height'] as const) {
		if (!Number.isFinite(config.stage[key]) || config.stage[key] <= 0) {
			throw new ConfigError(`Invalid config: stage.${key} must be a positive finite number, got ${config.stage[key]}`);
		}
	}
	if (!['auto', 'portrait', 'landscape', 'landscapeFlipped'].includes(config.stage.orientation)) {
		throw new ConfigError(`Invalid config: stage.orientation must be auto, portrait, landscape or landscapeFlipped, got '${config.stage.orientation}'`);
	}

	if (!VALID_SCALE_MODES.includes(config.stage.scaleMode as (typeof VALID_SCALE_MODES)[number])) {
		throw new ConfigError(
			`Invalid config: stage.scaleMode must be one of ${VALID_SCALE_MODES.map(m => `'${m}'`).join(', ')}, got '${config.stage.scaleMode}'`,
		);
	}

	const entryPath = path.resolve(root, config.entry);

	if (!(await exists(entryPath))) {
		throw new ConfigError(`Invalid config: entry file '${config.entry}' does not exist`);
	}

	if (config.html) {
		const templatePath = path.resolve(root, config.html.template);
		if (!(await exists(templatePath))) {
			throw new ConfigError(`Invalid config: HTML template '${config.html.template}' does not exist`);
		}
	}

	validateUIConfig(config.ui);

	return config;
}

/**
 * Validates UI source and optional component configuration.
 */
function validateUIConfig(ui: KUIConfig | undefined): void {
	if (!ui) return;
	if (!ui.sourceDir.trim()) {
		throw new ConfigError('Invalid config: ui.sourceDir must not be empty');
	}

	validateComponentsConfig(ui.components);
}

/**
 * Validates the component namespace and paired source/skin directories.
 */
function validateComponentsConfig(components: ComponentsConfig | undefined): void {
	if (!components) return;
	if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(components.namespace)) {
		throw new ConfigError(
			`Invalid config: ui.components.namespace must be a valid XML namespace prefix, got '${components.namespace}'`,
		);
	}
	if (!components.sourceDir.trim()) {
		throw new ConfigError('Invalid config: ui.components.sourceDir must not be empty');
	}
	if (!components.skinDir.trim()) {
		throw new ConfigError('Invalid config: ui.components.skinDir must not be empty');
	}
}
