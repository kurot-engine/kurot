import type { DisplayObjectContainer } from '@kurot/core';

export interface ValidationMetrics {
	commitProperties: number;
	measure: number;
	updateDisplayList: number;
	rendererCreated: number;
	rendererReused: number;
	maxLiveRenderers: number;
}

export interface ScenarioContext {
	root: DisplayObjectContainer;
	metrics: ValidationMetrics;
}

export interface BenchmarkScenario {
	id: string;
	name: string;
	description: string;
	objectCount: number;
	setup(context: ScenarioContext): void;
	update(frame: number, context: ScenarioContext): void;
	teardown(context: ScenarioContext): void;
}

export interface UIBenchmarkResult {
	protocolVersion: 1;
	uiVersion: '1.1.7';
	coreVersion: '1.0.15';
	scenarioId: string;
	scenarioName: string;
	objectCount: number;
	warmupFrames: number;
	measuredFrames: number;
	backend: 'webgl' | 'canvas2d';
	setupTimeMs: number;
	frameTimeMs: { p50: number; p95: number; p99: number; max: number };
	renderTimeMs: { p50: number; p95: number; p99: number; max: number };
	drawCalls: { median: number; max: number };
	validation: ValidationMetrics;
	createdAt: string;
}

declare global {
	interface Window {
		__UI_BENCHMARK_RESULT__?: UIBenchmarkResult;
		__UI_BENCHMARK_RUN__?: (scenarioId: string, warmupFrames?: number, measuredFrames?: number) => Promise<UIBenchmarkResult>;
	}
}
