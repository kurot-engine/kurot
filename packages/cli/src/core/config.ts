import * as path from 'node:path';
import { exists } from '../utils/fs.js';
import { ConfigError } from './errors.js';

export type BuildTarget = 'html5';

export interface StageConfig {
	/**
	 * Stage width in points.
	 */
	width: number;
	/**
	 * Stage height in points.
	 */
	height: number;
	/**
	 * Egret-style scale mode: `showAll` | `noScale` | `exactFit` | `noBorder` |
	 * `fixedHeight` | `fixedWidth` | `fixedNarrow` | `fixedWide`.
	 */
	scaleMode: string;
	/**
	 * Preferred device orientation (e.g. `auto`, `portrait`, `landscape`).
	 */
	orientation: string;
	/**
	 * Target frame rate, in frames per second.
	 */
	frameRate: number;
}

export interface ExmlConfig {
	/**
	 * Path to the Egret-style theme file (e.g. `resource/default.thm.json`),
	 * relative to the project root.
	 */
	themeFile: string;
	/**
	 * Custom EXML namespaces for project-defined components, matching Egret's
	 * `xmlns:game="game.*"` convention. Maps the namespace prefix used in EXML
	 * (e.g. `game`) to a barrel file that exports every class referenced under
	 * that namespace (e.g. `src/ui/index.ts` re-exporting `HeroNarrowIR`, etc.).
	 *
	 * Each barrel is bundled into its own chunk and wired into both the app and
	 * skins bundles via an import map, so a class referenced from EXML and from
	 * game code resolves to the same module instance (no duplicate class identity).
	 */
	namespaces?: Record<string, string>;
}

export interface OutputConfig {
	/**
	 * Development build output directory, relative to the project root
	 * (default: `bin-debug`). Release builds always go to
	 * `bin-release/web/<timestamp>` regardless of this setting.
	 */
	dir: string;
}

export interface HtmlConfig {
	/**
	 * Path to the project-owned HTML template, relative to the project root.
	 * Omit to use the CLI's built-in default template.
	 */
	template: string;
}

export interface ProjectConfig {
	/**
	 * Build target platform. Only `html5` is currently supported.
	 */
	target: BuildTarget;
	/**
	 * Path to the entry source file, relative to the project root
	 * (default: `src/Main.ts`).
	 */
	entry: string;
	/**
	 * Development build output settings.
	 */
	output: OutputConfig;
	/**
	 * HTML page template settings. Omit to use the built-in default page.
	 */
	html?: HtmlConfig;
	/**
	 * Stage / canvas configuration.
	 */
	stage: StageConfig;
	/**
	 * EXML compilation settings. Omit to disable EXML support entirely.
	 */
	exml?: ExmlConfig;
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

/**
 * Loads and validates `blakron.config.ts` (or `.js`) from the current working
 * directory, merging it over `DEFAULTS`. Falls back to `DEFAULTS` entirely
 * when no config file is present.
 *
 * @returns The validated project configuration
 * @throws {ConfigError} If `stage.frameRate`, `stage.scaleMode`, or `entry` is invalid
 */
export async function loadConfig(): Promise<ProjectConfig> {
	const configPath = path.resolve('blakron.config.ts');
	const jsConfigPath = path.resolve('blakron.config.js');

	let config: ProjectConfig;

	if ((await exists(configPath)) || (await exists(jsConfigPath))) {
		// Dynamic import of `blakron.config.ts` relies on Node's built-in
		// TypeScript type-stripping support (no `tsx`/`ts-node` involved).
		const mod = await import((await exists(configPath)) ? configPath : jsConfigPath);
		const userConfig: ProjectConfig = mod.default ?? mod;
		config = { ...DEFAULTS, ...userConfig, stage: { ...DEFAULTS.stage, ...userConfig.stage } };
	} else {
		config = DEFAULTS;
	}

	// Validate stage.frameRate
	if (!Number.isInteger(config.stage.frameRate) || config.stage.frameRate <= 0) {
		throw new ConfigError(
			`Invalid config: stage.frameRate must be a positive integer, got ${config.stage.frameRate}`,
		);
	}

	// Validate stage.scaleMode
	if (!VALID_SCALE_MODES.includes(config.stage.scaleMode as (typeof VALID_SCALE_MODES)[number])) {
		throw new ConfigError(
			`Invalid config: stage.scaleMode must be one of ${VALID_SCALE_MODES.map(m => `'${m}'`).join(', ')}, got '${config.stage.scaleMode}'`,
		);
	}

	// Validate entry file exists
	const entryPath = path.resolve(config.entry);
	if (!(await exists(entryPath))) {
		throw new ConfigError(`Invalid config: entry file '${config.entry}' does not exist`);
	}

	// Validate HTML template exists
	if (config.html) {
		const templatePath = path.resolve(config.html.template);
		if (!(await exists(templatePath))) {
			throw new ConfigError(`Invalid config: HTML template '${config.html.template}' does not exist`);
		}
	}

	return config;
}
