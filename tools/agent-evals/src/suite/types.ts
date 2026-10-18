import type { ComparisonRun, Plan } from '../comparison/types.js';

export type TaskKind = 'resources' | 'tween' | 'kui';
export const taskFiles = { resources: 'asset-hunt', tween: 'tween-sprint', kui: 'kui-quiz' } as const;

export interface SuitePlan extends Plan {
	readonly format: 'kurot-doc-comparison-v1';
	readonly experiment: 'gameplay-extension-v1' | 'gameplay-extension-v2';
	readonly oracleRevision?: number;
	readonly contextManifestSha256: string;
	readonly concurrency: number;
	readonly tasks: readonly TaskKind[];
}

export interface SuiteRun extends ComparisonRun {
	readonly task: TaskKind;
}

export interface DisplayProbe {
	readonly name: string;
	readonly x: number;
	readonly y: number;
	readonly numChildren?: number;
	getChildAt?(index: number): DisplayProbe;
}
