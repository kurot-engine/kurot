export interface Usage {
	readonly inputTokens: number;
	readonly cachedInputTokens: number;
	readonly outputTokens: number;
	readonly reasoningOutputTokens: number;
	readonly totalTokens: number;
}

export interface ProcessResult {
	readonly code: number;
	readonly timedOut: boolean;
	readonly durationMs: number;
}

export interface Check {
	readonly id: string;
	readonly passed: boolean;
	readonly detail: string;
}

export interface Attempt {
	readonly round: number;
	readonly model: ProcessResult;
	readonly usage?: Usage;
	readonly usageError?: string;
	readonly checks: readonly Check[];
	readonly accepted: boolean;
	readonly reusedModelArtifact?: string;
}

export interface ComparisonRun {
	readonly format: 'kurot-doc-comparison-v1';
	readonly id: string;
	readonly arm: 'old' | 'new';
	readonly startedAt: string;
	readonly attempts: readonly Attempt[];
}

export interface Plan {
	readonly format: 'kurot-doc-comparison-v1';
	readonly model: string;
	readonly reasoningEffort: string;
	readonly codexVersion: string;
	readonly baselineRevision: string;
	readonly trialsPerArm: number;
	readonly maxRepairRounds: number;
	readonly modelTimeoutMs: number;
	readonly sdk: Readonly<Record<string, string>>;
	readonly order: readonly ('old' | 'new')[];
}
