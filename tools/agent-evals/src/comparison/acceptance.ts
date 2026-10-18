import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { browserChecks } from './browser.js';
import { assertProtected } from './context.js';
import { runProcess } from './process.js';
import type { Check } from './types.js';

export async function acceptance(
	directory: string, artifacts: string, protectedFiles: Record<string, string>,
): Promise<Check[]> {
	await mkdir(artifacts, { recursive: true });
	const checks: Check[] = [];
	try {
		await assertProtected(directory, protectedFiles);
		checks.push({ id: 'integrity', passed: true, detail: 'Protected fixture/context unchanged.' });
	} catch (error) {
		return [{ id: 'integrity', passed: false, detail: String(error) }];
	}
	for (const [id, args] of [
		['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit']],
		['build', ['--import', 'tsx', 'node_modules/@kurot/cli/dist/index.js', 'build']],
	] as const) {
		if (id === 'build') await rm(path.join(directory, 'bin-debug'), { recursive: true, force: true });
		const prefix = path.join(artifacts, id);
		const result = await runProcess(process.execPath, args, directory, prefix, 60000);
		const detail = result.code === 0 ? 'Passed.' : (await readFile(`${prefix}.stdout`, 'utf8')) + (await readFile(`${prefix}.stderr`, 'utf8'));
		checks.push({ id, passed: result.code === 0 && !result.timedOut, detail });
	}
	if (checks.some(check => !check.passed)) return checks;
	try {
		checks.push(...await browserChecks(directory, artifacts));
	} catch (error) {
		checks.push({ id: 'browser-infrastructure', passed: false, detail: String(error) });
	}
	return checks;
}
