import { ConfigError } from '../errors.js';
import type { BuildMode } from '../project.js';
import type { Diagnostic } from './types.js';

export type BuildDiagnosticsFormat = 'human' | 'json';
export type DevDiagnosticsFormat = 'human' | 'jsonl';

export interface BuildResultOutput {
	readonly success: boolean;
	readonly command: 'build';
	readonly mode: BuildMode;
	readonly durationMs: number;
	readonly outputDir?: string;
	readonly diagnostics: readonly Diagnostic[];
}

export type DevEvent =
	| { readonly type: 'server-ready'; readonly url: string }
	| { readonly type: 'build-start'; readonly reason: 'initial' | 'exml-change' | 'source-change' }
	| { readonly type: 'diagnostic'; readonly diagnostic: Diagnostic }
	| { readonly type: 'build-complete'; readonly success: boolean; readonly durationMs: number };

export function parseBuildDiagnosticsFormat(value: string): BuildDiagnosticsFormat {
	if (value === 'human' || value === 'json') return value;
	throw new ConfigError(`Invalid build diagnostics format "${value}". Expected human or json.`);
}

export function parseDevDiagnosticsFormat(value: string): DevDiagnosticsFormat {
	if (value === 'human' || value === 'jsonl') return value;
	throw new ConfigError(`Invalid dev diagnostics format "${value}". Expected human or jsonl.`);
}

export function writeMachineOutput(value: BuildResultOutput | DevEvent): void {
	process.stdout.write(`${JSON.stringify(value)}\n`);
}
