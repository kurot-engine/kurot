import { describe, it, expect, vi } from 'vitest';
import { MetricsCollector } from '../src/blakron/benchmark/MetricsCollector.js';
import { BenchmarkRunner } from '../src/blakron/benchmark/BenchmarkRunner.js';
import { scenes, getScene } from '../src/blakron/benchmark/SceneRegistry.js';
import { fpsColorClass, PerfPanel } from '../src/blakron/benchmark/PerfPanel.js';
import type { PerfPanelElements } from '../src/blakron/benchmark/PerfPanel.js';
import type { FrameData, Stats } from '../src/blakron/benchmark/types.js';

function makeFrame(overrides: Partial<FrameData> = {}): FrameData {
	return {
		fps: 60,
		drawCalls: 10,
		renderTimeMs: 16.7,
		objectCount: 100,
		...overrides,
	};
}

describe('MetricsCollector', () => {
	it('空窗口时 getStats() 返回全零', () => {
		const collector = new MetricsCollector();
		const stats = collector.getStats();

		expect(stats.frameCount).toBe(0);
		expect(stats.fps.current).toBe(0);
		expect(stats.fps.avg).toBe(0);
		expect(stats.fps.p50).toBe(0);
		expect(stats.fps.p95).toBe(0);
		expect(stats.fps.max).toBe(0);
		expect(stats.render.current).toBe(0);
		expect(stats.render.avg).toBe(0);
		expect(stats.drawCalls.current).toBe(0);
		expect(stats.drawCalls.avg).toBe(0);
		expect(stats.batchEfficiency).toBe(0);
		expect(stats.isLowFps).toBe(false);
	});

	it('单帧记录后 frameCount === 1，fps.current 正确', () => {
		const collector = new MetricsCollector();
		collector.record(makeFrame({ fps: 45, drawCalls: 5, renderTimeMs: 20, objectCount: 50 }));
		const stats = collector.getStats();

		expect(stats.frameCount).toBe(1);
		expect(stats.fps.current).toBe(45);
		expect(stats.fps.avg).toBe(45);
		expect(stats.drawCalls.current).toBe(5);
		expect(stats.batchEfficiency).toBe(50 / 5);
	});

	it('满窗口（300帧）后 frameCount === 300', () => {
		const collector = new MetricsCollector();
		for (let i = 0; i < 300; i++) {
			collector.record(makeFrame({ fps: 60 }));
		}
		const stats = collector.getStats();
		expect(stats.frameCount).toBe(300);
	});

	it('超出窗口（301帧）后 frameCount 仍为 300，最旧帧被覆盖', () => {
		const collector = new MetricsCollector();
		// 先写入 300 帧 fps=10（旧帧）
		for (let i = 0; i < 300; i++) {
			collector.record(makeFrame({ fps: 10 }));
		}
		// 写入第 301 帧 fps=99（新帧覆盖最旧帧）
		collector.record(makeFrame({ fps: 99 }));

		const stats = collector.getStats();
		// frameCount 不超过窗口大小
		expect(stats.frameCount).toBe(300);
		// 最新帧 fps 应为 99
		expect(stats.fps.current).toBe(99);
		// 窗口内有 299 帧 fps=10 和 1 帧 fps=99，avg 应接近 10
		const expectedAvg = (299 * 10 + 99) / 300;
		expect(stats.fps.avg).toBeCloseTo(expectedAvg, 5);
	});

	it('isLowFps() 在连续 10 帧 renderTimeMs > 33.3 时返回 true', () => {
		const collector = new MetricsCollector();
		for (let i = 0; i < 10; i++) {
			collector.record(makeFrame({ renderTimeMs: 40 }));
		}
		expect(collector.isLowFps()).toBe(true);
		expect(collector.getStats().isLowFps).toBe(true);
	});

	it('isLowFps() 在 9 帧 > 33.3 后第 10 帧 ≤ 33.3 时返回 false', () => {
		const collector = new MetricsCollector();
		// 先写 9 帧高延迟
		for (let i = 0; i < 9; i++) {
			collector.record(makeFrame({ renderTimeMs: 40 }));
		}
		// 第 10 帧低延迟
		collector.record(makeFrame({ renderTimeMs: 16 }));
		expect(collector.isLowFps()).toBe(false);
		expect(collector.getStats().isLowFps).toBe(false);
	});

	it('reset() 后 frameCount 归零', () => {
		const collector = new MetricsCollector();
		for (let i = 0; i < 50; i++) {
			collector.record(makeFrame());
		}
		collector.reset();
		const stats = collector.getStats();
		expect(stats.frameCount).toBe(0);
		expect(stats.fps.current).toBe(0);
	});
});

// ─── BenchmarkRunner ────────────────────────────────────────────────────────

function makeRunner() {
	const collector = new MetricsCollector();
	const onPhaseChange = vi.fn();
	const scenes = new Map([
		[
			'test-scene',
			{
				id: 'test-scene',
				build: vi.fn((_container: unknown, _count: number) => vi.fn()),
			},
		],
	]);
	const getSceneDescriptor = (id: string) => scenes.get(id);
	const container = {};
	const runner = new BenchmarkRunner(collector, onPhaseChange, getSceneDescriptor, container);
	return { runner, collector, onPhaseChange, scenes };
}

const perfFrame = { fps: 60, drawCalls: 10, renderTimeMs: 16.7 };

describe('BenchmarkRunner', () => {
	it('初始状态为 idle', () => {
		const { runner } = makeRunner();
		expect(runner.getPhase()).toBe('idle');
	});

	it('switchScene 后状态变为 warmup', () => {
		const { runner, onPhaseChange } = makeRunner();
		runner.switchScene('test-scene', 100);
		expect(runner.getPhase()).toBe('warmup');
		expect(onPhaseChange).toHaveBeenCalledWith('warmup');
	});

	it('warmup 阶段 60 帧后自动切换到 measuring', () => {
		const { runner, onPhaseChange } = makeRunner();
		runner.switchScene('test-scene', 100);
		// 前 59 帧仍在 warmup
		for (let i = 0; i < 59; i++) {
			runner.onFrame(perfFrame);
		}
		expect(runner.getPhase()).toBe('warmup');
		// 第 60 帧切换到 measuring
		runner.onFrame(perfFrame);
		expect(runner.getPhase()).toBe('measuring');
		expect(onPhaseChange).toHaveBeenCalledWith('measuring');
	});

	it('measuring 阶段 onFrame 调用 collector.record', () => {
		const { runner, collector } = makeRunner();
		runner.switchScene('test-scene', 100);
		// 完成 warmup
		for (let i = 0; i < 60; i++) {
			runner.onFrame(perfFrame);
		}
		expect(runner.getPhase()).toBe('measuring');
		const before = collector.getStats().frameCount;
		runner.onFrame(perfFrame);
		expect(collector.getStats().frameCount).toBe(before + 1);
	});

	it('pause() 将 measuring 切换到 paused', () => {
		const { runner, onPhaseChange } = makeRunner();
		runner.switchScene('test-scene', 100);
		for (let i = 0; i < 60; i++) runner.onFrame(perfFrame);
		expect(runner.getPhase()).toBe('measuring');
		runner.pause();
		expect(runner.getPhase()).toBe('paused');
		expect(onPhaseChange).toHaveBeenCalledWith('paused');
	});

	it('resume() 将 paused 切换到 measuring', () => {
		const { runner, onPhaseChange } = makeRunner();
		runner.switchScene('test-scene', 100);
		for (let i = 0; i < 60; i++) runner.onFrame(perfFrame);
		runner.pause();
		runner.resume();
		expect(runner.getPhase()).toBe('measuring');
		expect(onPhaseChange).toHaveBeenCalledWith('measuring');
	});

	it('resetMeasurement() 重置到 warmup 并清空 collector', () => {
		const { runner, collector, onPhaseChange } = makeRunner();
		runner.switchScene('test-scene', 100);
		// 完成 warmup 并记录几帧
		for (let i = 0; i < 60; i++) runner.onFrame(perfFrame);
		runner.onFrame(perfFrame);
		runner.onFrame(perfFrame);
		expect(collector.getStats().frameCount).toBeGreaterThan(0);
		runner.resetMeasurement();
		expect(runner.getPhase()).toBe('warmup');
		expect(collector.getStats().frameCount).toBe(0);
		expect(onPhaseChange).toHaveBeenCalledWith('warmup');
	});

	it('warmup 阶段的帧数据不进入 collector', () => {
		const { runner, collector } = makeRunner();
		runner.switchScene('test-scene', 100);
		// 发送 59 帧（仍在 warmup）
		for (let i = 0; i < 59; i++) {
			runner.onFrame(perfFrame);
		}
		// collector 应该没有任何记录
		expect(collector.getStats().frameCount).toBe(0);
		// 第 60 帧触发切换到 measuring，但本帧数据不记录（warmup 最后一帧）
		runner.onFrame(perfFrame);
		expect(runner.getPhase()).toBe('measuring');
		expect(collector.getStats().frameCount).toBe(0);
		// 第 61 帧才开始记录
		runner.onFrame(perfFrame);
		expect(collector.getStats().frameCount).toBe(1);
	});

	it('idle 状态下 onFrame 不记录数据', () => {
		const { runner, collector } = makeRunner();
		runner.onFrame(perfFrame);
		expect(collector.getStats().frameCount).toBe(0);
	});

	it('paused 状态下 onFrame 不记录数据', () => {
		const { runner, collector } = makeRunner();
		runner.switchScene('test-scene', 100);
		for (let i = 0; i < 60; i++) runner.onFrame(perfFrame);
		runner.pause();
		const countBeforePause = collector.getStats().frameCount;
		runner.onFrame(perfFrame);
		runner.onFrame(perfFrame);
		expect(collector.getStats().frameCount).toBe(countBeforePause);
	});
});

// ─── SceneRegistry ──────────────────────────────────────────────────────────

describe('SceneRegistry', () => {
	it('scenes 数组有 5 个元素', () => {
		expect(scenes).toHaveLength(5);
	});

	it('每个场景有 id、label、defaultCount、minCount、maxCount 字段', () => {
		for (const scene of scenes) {
			expect(typeof scene.id).toBe('string');
			expect(typeof scene.label).toBe('string');
			expect(typeof scene.defaultCount).toBe('number');
			expect(typeof scene.minCount).toBe('number');
			expect(typeof scene.maxCount).toBe('number');
		}
	});

	it('sprite-batch 的 minCount=50、maxCount=2000', () => {
		const scene = getScene('sprite-batch');
		expect(scene).toBeDefined();
		expect(scene!.minCount).toBe(50);
		expect(scene!.maxCount).toBe(2000);
	});

	it('filter-heavy 的 maxCount=200', () => {
		const scene = getScene('filter-heavy');
		expect(scene).toBeDefined();
		expect(scene!.maxCount).toBe(200);
	});

	it('getScene("sprite-batch") 返回正确场景', () => {
		const scene = getScene('sprite-batch');
		expect(scene).toBeDefined();
		expect(scene!.id).toBe('sprite-batch');
		expect(scene!.label).toBe('Sprite Batch');
	});

	it('getScene("nonexistent") 返回 undefined', () => {
		expect(getScene('nonexistent')).toBeUndefined();
	});

	it('sprite-batch build 函数使用 mock factory 正常运行并返回 cleanup', () => {
		const $children: unknown[] = [];
		const factory = {
			createBitmap: () => ({ x: 0, y: 0, rotation: 0, alpha: 1 }),
			createShape: () => ({ x: 0, y: 0 }),
			createSprite: () => ({ x: 0, y: 0 }),
			addChild: (_parent: unknown, child: unknown) => {
				$children.push(child);
			},
			removeChild: (_parent: unknown, child: unknown) => {
				const idx = $children.indexOf(child);
				if (idx !== -1) $children.splice(idx, 1);
			},
			addEventListener: () => {},
			removeEventListener: () => {},
		};
		const container = {};
		const scene = getScene('sprite-batch')!;
		const cleanup = (scene.build as any)(container, 10, factory);
		expect($children).toHaveLength(10);
		cleanup();
		expect($children).toHaveLength(0);
	});
});

// ─── fpsColorClass ──────────────────────────────────────────────────────────

describe('fpsColorClass', () => {
	it('fps >= 55 返回 good', () => {
		expect(fpsColorClass(55)).toBe('good');
	});

	it('fps >= 55 边界 60 返回 good', () => {
		expect(fpsColorClass(60)).toBe('good');
	});

	it('fps 30-54 返回 warn', () => {
		expect(fpsColorClass(30)).toBe('warn');
	});

	it('fps 54.9 返回 warn', () => {
		expect(fpsColorClass(54.9)).toBe('warn');
	});

	it('fps < 30 返回 bad', () => {
		expect(fpsColorClass(29.9)).toBe('bad');
	});

	it('fps 0 返回 bad', () => {
		expect(fpsColorClass(0)).toBe('bad');
	});
});

// ─── PerfPanel ───────────────────────────────────────────────────────────────

function makeMockEls(): PerfPanelElements {
	const el = () => ({ textContent: '', className: '' }) as unknown as HTMLElement;
	const canvas = {
		width: 200,
		height: 60,
		getContext: () => ({
			clearRect: () => {},
			beginPath: () => {},
			moveTo: () => {},
			lineTo: () => {},
			stroke: () => {},
			strokeStyle: '',
			lineWidth: 1,
			fillStyle: '',
			fillRect: () => {},
		}),
	} as unknown as HTMLCanvasElement;
	return {
		fps: el(),
		drawCalls: el(),
		renderCurrent: el(),
		renderAvg: el(),
		renderP95: el(),
		batchEfficiency: el(),
		frameCount: el(),
		status: el(),
		graphCanvas: canvas,
	};
}

function makeEmptyStats(): Stats {
	const summary = { current: 0, avg: 0, p50: 0, p95: 0, max: 0 };
	return {
		frameCount: 0,
		fps: { ...summary },
		render: { ...summary },
		drawCalls: { current: 0, avg: 0 },
		batchEfficiency: 0,
		isLowFps: false,
	};
}

describe('PerfPanel', () => {
	it('warmup 阶段 status 显示"预热中…"', () => {
		const els = makeMockEls();
		const panel = new PerfPanel(els);
		panel.update(makeEmptyStats(), 'warmup');
		expect(els.status.textContent).toBe('预热中…');
	});

	it('warmup 阶段所有数值元素显示"--"', () => {
		const els = makeMockEls();
		const panel = new PerfPanel(els);
		panel.update(makeEmptyStats(), 'warmup');
		expect(els.fps.textContent).toBe('--');
		expect(els.drawCalls.textContent).toBe('--');
		expect(els.renderCurrent.textContent).toBe('--');
		expect(els.renderAvg.textContent).toBe('--');
		expect(els.renderP95.textContent).toBe('--');
		expect(els.batchEfficiency.textContent).toBe('--');
		expect(els.frameCount.textContent).toBe('--');
	});

	it('warmup 阶段数值元素添加 dimmed class', () => {
		const els = makeMockEls();
		const panel = new PerfPanel(els);
		panel.update(makeEmptyStats(), 'warmup');
		expect(els.fps.className).toBe('dimmed');
		expect(els.drawCalls.className).toBe('dimmed');
	});

	it('measuring 阶段 status 显示"测量中"', () => {
		const els = makeMockEls();
		const panel = new PerfPanel(els);
		panel.update(makeEmptyStats(), 'measuring');
		expect(els.status.textContent).toBe('测量中');
	});

	it('measuring 阶段 fps 元素显示正确数值', () => {
		const els = makeMockEls();
		const panel = new PerfPanel(els);
		const stats = makeEmptyStats();
		stats.fps = { current: 58, avg: 57, p50: 57, p95: 56, max: 60 };
		panel.update(stats, 'measuring');
		expect(els.fps.textContent).toBe('58.0');
	});

	it('measuring 阶段 render 元素显示带单位的数值', () => {
		const els = makeMockEls();
		const panel = new PerfPanel(els);
		const stats = makeEmptyStats();
		stats.render = { current: 1.234, avg: 1.18, p50: 1.2, p95: 1.45, max: 2.0 };
		panel.update(stats, 'measuring');
		expect(els.renderCurrent.textContent).toBe('1.23 ms');
		expect(els.renderAvg.textContent).toBe('1.18 ms');
		expect(els.renderP95.textContent).toBe('1.45 ms');
	});

	it('paused 阶段 status 显示"已暂停"', () => {
		const els = makeMockEls();
		const panel = new PerfPanel(els);
		panel.update(makeEmptyStats(), 'paused');
		expect(els.status.textContent).toBe('已暂停');
	});
});

// ─── ReportExporter ──────────────────────────────────────────────────────────

import { ReportExporter } from '../src/blakron/benchmark/ReportExporter.js';
import type { ReportData } from '../src/blakron/benchmark/types.js';

function makeStats(): Stats {
	return {
		frameCount: 100,
		fps: { current: 60, avg: 59.8, p50: 60, p95: 58.2, max: 61 },
		render: { current: 16.7, avg: 16.5, p50: 16.6, p95: 17.2, max: 18.0 },
		drawCalls: { current: 10, avg: 9.5 },
		batchEfficiency: 52.6,
		isLowFps: false,
	};
}

describe('ReportExporter', () => {
	it('buildReport 返回包含所有必需字段的对象', () => {
		const exporter = new ReportExporter();
		const report = exporter.buildReport('sprite-batch', 500, makeStats());

		expect(report).toHaveProperty('timestamp');
		expect(report).toHaveProperty('userAgent');
		expect(report).toHaveProperty('scene');
		expect(report).toHaveProperty('objectCount');
		expect(report).toHaveProperty('fps');
		expect(report.fps).toHaveProperty('avg');
		expect(report.fps).toHaveProperty('p95');
		expect(report.fps).toHaveProperty('max');
		expect(report).toHaveProperty('renderTimeMs');
		expect(report.renderTimeMs).toHaveProperty('avg');
		expect(report.renderTimeMs).toHaveProperty('p95');
		expect(report.renderTimeMs).toHaveProperty('max');
		expect(report).toHaveProperty('drawCallsAvg');
		expect(report).toHaveProperty('batchEfficiencyAvg');
	});

	it('buildReport 的 timestamp 是有效 ISO 8601 字符串', () => {
		const exporter = new ReportExporter();
		const report = exporter.buildReport('sprite-batch', 500, makeStats());

		expect(typeof report.timestamp).toBe('string');
		// ISO 8601 格式：YYYY-MM-DDTHH:mm:ss.sssZ
		expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		// 可以被 Date 解析
		expect(isNaN(new Date(report.timestamp).getTime())).toBe(false);
	});

	it('buildReport 的 scene 和 objectCount 正确', () => {
		const exporter = new ReportExporter();
		const report = exporter.buildReport('filter-heavy', 200, makeStats());

		expect(report.scene).toBe('filter-heavy');
		expect(report.objectCount).toBe(200);
	});

	it('formatMarkdown 输出包含 | 开头结尾的行', () => {
		const exporter = new ReportExporter();
		const stats = makeStats();
		const report = exporter.buildReport('sprite-batch', 500, stats);
		const md = exporter.formatMarkdown(report);

		const lines = md.split('\n').filter(l => l.trim().length > 0);
		expect(lines.length).toBeGreaterThan(0);
		for (const line of lines) {
			expect(line.startsWith('|')).toBe(true);
			expect(line.endsWith('|')).toBe(true);
		}
	});

	it('formatMarkdown 输出包含表头行（含 场景 或 scene）', () => {
		const exporter = new ReportExporter();
		const report = exporter.buildReport('sprite-batch', 500, makeStats());
		const md = exporter.formatMarkdown(report);

		const hasHeader = md.includes('场景') || md.toLowerCase().includes('scene');
		expect(hasHeader).toBe(true);
	});

	it('formatMarkdown 输出包含分隔行（含 ---）', () => {
		const exporter = new ReportExporter();
		const report = exporter.buildReport('sprite-batch', 500, makeStats());
		const md = exporter.formatMarkdown(report);

		expect(md).toContain('---');
	});

	it('formatMarkdown 输出包含数据行（含场景 ID）', () => {
		const exporter = new ReportExporter();
		const report = exporter.buildReport('sprite-batch', 500, makeStats());
		const md = exporter.formatMarkdown(report);

		expect(md).toContain('sprite-batch');
	});
});
