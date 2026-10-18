import type { SuitePlan, TaskKind } from './types.js';

export interface JobPair {
	readonly repeat: number;
	readonly task: TaskKind;
	readonly arms: readonly ('old' | 'new')[];
}

export function schedule(plan: SuitePlan): JobPair[] {
	if (!['gameplay-extension-v1', 'gameplay-extension-v2'].includes(plan.experiment) || plan.concurrency !== 2 ||
		!Number.isSafeInteger(plan.trialsPerArm) || plan.trialsPerArm < 1 ||
		plan.tasks.length !== 3 || new Set(plan.tasks).size !== 3 ||
		!['resources', 'tween', 'kui'].every(task => plan.tasks.includes(task as TaskKind)) ||
		plan.order.length !== plan.trialsPerArm * 2 || Object.values(plan.sdk).some(version => !/^\d+\.\d+\.\d+$/.test(version))) {
		throw new Error('Invalid task set, fixed versions, concurrency or repetition plan.');
	}
	const pairs: JobPair[] = [];
	for (let repeat = 0; repeat < plan.trialsPerArm; repeat++) {
		const arms = plan.order.slice(repeat * 2, repeat * 2 + 2);
		if (new Set(arms).size !== 2 || !arms.includes('old') || !arms.includes('new')) throw new Error('Every task pair needs one old and one new arm.');
		const rotated = [...plan.tasks.slice(repeat % 3), ...plan.tasks.slice(0, repeat % 3)];
		for (const task of rotated) { pairs.push({ repeat: repeat + 1, task, arms }); }
	}
	return pairs;
}
