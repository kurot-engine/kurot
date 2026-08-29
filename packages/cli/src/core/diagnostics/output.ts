import { ConfigError } from '../errors.js';
import type { BuildMode } from '../project.js';
import type { Diagnostic } from './types.js';

/**
 * Supported output formats for one-shot builds.
 */
export type BuildDiagnosticsFormat = 'human' | 'json';

/**
 * Supported output formats for the long-lived development server.
 */
export type DevDiagnosticsFormat = 'human' | 'jsonl';

/**
 * Serializable result emitted by `build --diagnostics json`.
 */
export interface BuildResultOutput {
	readonly success: boolean;
	readonly command: 'build';
	readonly mode: BuildMode;
	/**
	 * Total command duration in milliseconds.
	 */
	readonly durationMs: number;
	/**
	 * Absolute build output path; omitted when the project could not be resolved.
	 */
	readonly outputDir?: string;
	readonly diagnostics: readonly Diagnostic[];
}

/**
 * Lifecycle event emitted by `dev --diagnostics jsonl`.
 */
export type DevEvent =
	| { readonly type: 'server-ready'; readonly url: string }
	| { readonly type: 'build-start'; readonly reason: 'initial' | 'exml-change' | 'source-change' }
	| { readonly type: 'diagnostic'; readonly diagnostic: Diagnostic }
	| { readonly type: 'build-complete'; readonly success: boolean; readonly durationMs: number };


/**
 * Parses the build diagnostic format accepted by the command line.
 *
 * @throws {ConfigError} If the value is not a supported build format.
 */
export function parseBuildDiagnosticsFormat(value: string): BuildDiagnosticsFormat {
	if (value === 'human' || value === 'json') return value;
	throw new ConfigError(`Invalid build diagnostics format "${value}". Expected human or json.`);
}


/**
 * Parses the development diagnostic format accepted by the command line.
 *
 * @throws {ConfigError} If the value is not a supported development format.
 */
export function parseDevDiagnosticsFormat(value: string): DevDiagnosticsFormat {
	if (value === 'human' || value === 'jsonl') return value;
	throw new ConfigError(`Invalid dev diagnostics format "${value}". Expected human or jsonl.`);
}


/**
 * Writes one JSON value followed by a newline to stdout.
 */
export function writeMachineOutput(value: BuildResultOutput | DevEvent): void {
	process.stdout.write(`${JSON.stringify(value)}\n`);
}
