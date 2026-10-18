import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './model.js';
import type { Coverage } from './catalog.js';

export function newCommentGaps(actual: readonly string[], baseline: readonly string[]): string[] {
	const accepted = new Set(baseline);
	return actual.filter(name => !accepted.has(name));
}

export async function checkCommentCoverage(coverage: Coverage): Promise<void> {
	const baseline = JSON.parse(await readFile(path.join(root, 'tools/api-docs/comment-baseline.json'), 'utf8')) as Record<string, string[]>;
	const added = newCommentGaps(coverage.withoutComment, baseline[coverage.package] ?? []);
	if (added.length) throw new Error(`${coverage.package}: new behavioral-comment gaps: ${added.join(', ')}. Add JSDoc or explicitly review the baseline.`);
}
