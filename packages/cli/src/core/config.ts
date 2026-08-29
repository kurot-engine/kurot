import * as path from 'node:path';
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

export interface ExmlConfig {
	/**
	 * Path to the Egret-style theme file (e.g. `resource/default.thm.json`),
	 * relative to the project root.
	 */
	readonly themeFile: string;
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
	readonly namespaces?: Readonly<Record<string, string>>;
	/**
	 * Convention-based reusable UI components.
	 *
	 * A component source `<Name>.ts` under `sourceDir` is paired with
	 * `<Name>Skin.exml` at the same relative path under `skinDir`. The CLI
	 * exposes paired components through `namespace` without requiring a
	 * hand-written namespace barrel.
	 */
	readonly components?: ComponentsConfig;
}

export interface ComponentsConfig {
	/**
	 * EXML namespace prefix used to instantiate discovered components.
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
	 * Development build output settings.
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
	 * EXML compilation settings. Omit to disable EXML support entirely.
	 */
	readonly exml?: ExmlConfig;
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
 * Loads and validates `kurot.config.ts` (or `.js`) from the current working
 * directory, merging it over `DEFAULTS`. Falls back to `DEFAULTS` entirely
 * when no config file is present.
 *
 * @returns The validated project configuration.
 * @throws {ConfigError} If the project configuration is invalid.
 */
export async function loadConfig(): Promise<ProjectConfig> {
	const configPath = path.resolve('kurot.config.ts');
	const jsConfigPath = path.resolve('kurot.config.js');

	let config: ProjectConfig;

	if ((await exists(configPath)) || (await exists(jsConfigPath))) {
		// Dynamic import of `kurot.config.ts` relies on Node's built-in
		// TypeScript type-stripping support (no `tsx`/`ts-node` involved).
		const mod = await import((await exists(configPath)) ? configPath : jsConfigPath);
		const userConfig: ProjectConfig = mod.default ?? mod;
		config = { ...DEFAULTS, ...userConfig, stage: { ...DEFAULTS.stage, ...userConfig.stage } };
	} else {
		config = DEFAULTS;
	}

	if (!Number.isInteger(config.stage.frameRate) || config.stage.frameRate <= 0) {
		throw new ConfigError(
			`Invalid config: stage.frameRate must be a positive integer, got ${config.stage.frameRate}`,
		);
	}

	if (!VALID_SCALE_MODES.includes(config.stage.scaleMode as (typeof VALID_SCALE_MODES)[number])) {
		throw new ConfigError(
			`Invalid config: stage.scaleMode must be one of ${VALID_SCALE_MODES.map(m => `'${m}'`).join(', ')}, got '${config.stage.scaleMode}'`,
		);
	}

	const entryPath = path.resolve(config.entry);
	if (!(await exists(entryPath))) {
		throw new ConfigError(`Invalid config: entry file '${config.entry}' does not exist`);
	}

	if (config.html) {
		const templatePath = path.resolve(config.html.template);
		if (!(await exists(templatePath))) {
			throw new ConfigError(`Invalid config: HTML template '${config.html.template}' does not exist`);
		}
	}

	validateComponentsConfig(config.exml?.components);

	return config;
}

function validateComponentsConfig(components: ComponentsConfig | undefined): void {
	if (!components) return;
	if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(components.namespace)) {
		throw new ConfigError(
			`Invalid config: exml.components.namespace must be a valid XML namespace prefix, got '${components.namespace}'`,
		);
	}
	if (!components.sourceDir.trim()) {
		throw new ConfigError('Invalid config: exml.components.sourceDir must not be empty');
	}
	if (!components.skinDir.trim()) {
		throw new ConfigError('Invalid config: exml.components.skinDir must not be empty');
	}
}
