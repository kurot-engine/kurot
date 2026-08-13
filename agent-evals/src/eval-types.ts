export type EvalCategory = 'basic' | 'interaction' | 'ui' | 'gameplay' | 'debugging';

export type AcceptanceKind = 'command' | 'file' | 'diagnostic' | 'behavior' | 'visual';

export interface AcceptanceCheck {
	readonly id: string;
	readonly kind: AcceptanceKind;
	readonly description: string;
}

export interface EvalTask {
	readonly schemaVersion: '1';
	readonly id: string;
	readonly category: EvalCategory;
	readonly title: string;
	readonly prompt: string;
	readonly acceptance: readonly AcceptanceCheck[];
}

export interface EvalRunMetrics {
	readonly firstBuildSucceeded: boolean;
	readonly firstRunSucceeded: boolean;
	readonly behaviorAccepted: boolean;
	readonly visualAccepted: boolean;
	readonly repairRounds: number;
	readonly tokenCount: number;
	readonly durationMs: number;
	readonly inventedApiCount: number;
	readonly internalApiUseCount: number;
	readonly foreignConventionCount: number;
}

export interface EvalRun {
	readonly schemaVersion: '1';
	readonly taskId: string;
	readonly model: string;
	readonly kurotRevision: string;
	readonly startedAt: string;
	readonly metrics: EvalRunMetrics;
}
