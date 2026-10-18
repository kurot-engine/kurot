import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { infrastructureFailure } from './jobs.js';
import type { SuiteRun, TaskKind } from './types.js';

export interface GroupSummary {
	readonly task: TaskKind | 'all';
	readonly arm: 'old' | 'new';
	readonly completed: number;
	readonly planned: number;
	readonly firstSuccesses: number;
	readonly finalSuccesses: number;
	readonly infrastructureFailures: number;
	readonly repairRounds: readonly number[];
	readonly meanRepairRounds?: number;
	readonly usageComplete: boolean;
	readonly knownTotalTokens: number;
	readonly missingUsageAttempts: number;
	readonly meanTotalTokens?: number;
	readonly meanFirstAttemptTokens?: number;
	readonly meanUncachedInputTokens?: number;
	readonly meanCachedInputTokens?: number;
	readonly meanOutputTokens?: number;
}

export function suiteSummary(runs: readonly SuiteRun[], expectedPerTask = 5): GroupSummary[] {
	const rows: GroupSummary[] = [];
	for (const task of ['resources', 'tween', 'kui', 'all'] as const) {
		for (const arm of ['old', 'new'] as const) {
			const group = runs.filter(run => run.arm === arm && (task === 'all' || run.task === task));
			const attempts = group.flatMap(run => run.attempts);
			const usageComplete = group.length > 0 && attempts.every(attempt => attempt.usage !== undefined);
			const knownTotalTokens = attempts.reduce((sum, attempt) => sum + (attempt.usage?.totalTokens ?? 0), 0);
			const repairRounds = group.map(run => Math.max(0, run.attempts.length - 1));
			rows.push({
				task, arm, completed: group.length, planned: expectedPerTask * (task === 'all' ? 3 : 1),
				firstSuccesses: group.filter(run => run.attempts[0]?.accepted).length,
				finalSuccesses: group.filter(run => run.attempts.at(-1)?.accepted).length,
				infrastructureFailures: group.filter(run => run.attempts.some(infrastructureFailure)).length,
				repairRounds, ...(group.length > 0 ? { meanRepairRounds: repairRounds.reduce((sum, value) => sum + value, 0) / group.length } : {}),
				usageComplete, knownTotalTokens, missingUsageAttempts: attempts.filter(attempt => !attempt.usage).length,
				...(usageComplete ? {
					meanTotalTokens: knownTotalTokens / group.length,
					meanFirstAttemptTokens: group.reduce((sum, run) => sum + (run.attempts[0].usage?.totalTokens ?? 0), 0) / group.length,
					meanUncachedInputTokens: attempts.reduce((sum, attempt) => sum + (attempt.usage ? attempt.usage.inputTokens - attempt.usage.cachedInputTokens : 0), 0) / group.length,
					meanCachedInputTokens: attempts.reduce((sum, attempt) => sum + (attempt.usage?.cachedInputTokens ?? 0), 0) / group.length,
					meanOutputTokens: attempts.reduce((sum, attempt) => sum + (attempt.usage?.outputTokens ?? 0), 0) / group.length,
				} : {}),
			});
		}
	}
	return rows;
}

export async function writeReport(directory: string, runs: readonly SuiteRun[]): Promise<void> {
	const rows = suiteSummary(runs);
	const number = (value: number | undefined): string => value === undefined ? '不可用' : Math.round(value).toLocaleString('en-US');
	const lines = [
		'# Kurot 资源 / Tween / KUI 文档对照实验', '',
		`正式样本进度：${runs.length}/30。固定 gpt-6.1-sol（medium）、Core 2.5.4、Game 2.0.0、UI 3.1.0、CLI 3.3.1。`, '',
		'每个任务每种入口计划 5 次，最多两轮外部修复；同一任务两组并行调用模型，浏览器验收串行。首次成功是第一次交付通过外部验收，交付前自查计入该次 tokens。', '',
		'| 任务 | 入口 | 完成/计划 | 首次通过 | 最终通过 | 平均总 tokens | 平均修复轮次 | 基础设施失败 |',
		'| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
	];
	for (const row of rows) {
		lines.push(`| ${row.task} | ${row.arm} | ${row.completed}/${row.planned} | ${row.firstSuccesses} | ${row.finalSuccesses} | ${number(row.meanTotalTokens)} | ${row.meanRepairRounds?.toFixed(2) ?? '不可用'} | ${row.infrastructureFailures} |`);
	}
	lines.push('', '平均总 tokens 包含该样本的全部外部修复调用，计算为输入+输出；缓存输入及推理输出是子集，不重复累加。任何用量缺失都会标为不可用，基础设施失败单列。不是货币账单。', '',
		'## 逐次结果', '', '| 样本 | 任务 | 入口 | 首次通过 | 最终通过 | 总 tokens | 修复轮次 | 首轮失败项 |', '| --- | --- | --- | --- | --- | ---: | ---: | --- |');
	for (const run of runs) {
		const complete = run.attempts.every(attempt => attempt.usage);
		const total = run.attempts.reduce((sum, attempt) => sum + (attempt.usage?.totalTokens ?? 0), 0);
		const failed = run.attempts[0].checks.filter(check => !check.passed).map(check => check.id).join(', ') || (infrastructureFailure(run.attempts[0]) ? 'infrastructure' : '—');
		lines.push(`| ${run.id} | ${run.task} | ${run.arm} | ${run.attempts[0].accepted} | ${run.attempts.at(-1)?.accepted} | ${complete ? number(total) : '不可用'} | ${run.attempts.length - 1} | ${failed} |`);
	}
	lines.push('', '## 证据与限制', '',
		'- [完整机器记录](comparison.json)：每轮验收、模型用量和运行元数据。',
		'- 原始 JSONL、每次交付源码、编译日志、截图和浏览器 trace 在 artifacts.txt 指向的归档中。',
		'- 两组沿用第三步的同一文档快照；仅扩展共同任务和固定 SDK 安装。模型标识固定，但服务端权重与随机种子未公开。',
		'- SDK 和两个原有锁文件被复制、校验；没有安装、依赖升级、版本提升或发布。',
		'- 这是三种小型游戏各 5 次的样本；复用同一模型、共享缓存及并发调用仍有波动，不应外推到所有游戏。', '');
	await writeFile(path.join(directory, 'SUMMARY.md'), lines.join('\n'));
}
