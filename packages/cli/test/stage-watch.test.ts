import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { DevEvent } from '../src/core/diagnostics/index.js';
import { availablePort, createCliProject, startCli, stopCli, waitForJsonLine } from './cli-process-helpers.js';

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('dev stage configuration watching', () => {
	it.each(['ts', 'js'])('reloads .%s edits and atomic replacements without restarting; retains and recovers valid output', async extension => {
		const root = await createCliProject();
		roots.push(root);
		await fs.writeFile(path.join(root, 'package.json'), '{"type":"module"}');
		const file = path.join(root, `kurot.config.${extension}`);
		if (extension === 'js') {
			await fs.rename(path.join(root, 'kurot.config.ts'), file);
		}
		await fs.writeFile(file, config(640));
		const port = await availablePort();
		const child = startCli(root, ['dev', '--port', String(port), '--diagnostics', 'jsonl']);
		try {
			await waitForJsonLine<DevEvent>(child, event => event.type === 'server-ready');
			await update(child, async () => {
				await fs.writeFile(`${file}.next`, config(1136));
				await fs.rename(`${file}.next`, file);
			});
			const response = await fetch(`http://localhost:${port}`);
			expect(response.headers.get('cache-control')).toBe('no-store');
			const valid = await response.text();
			expect(valid).toContain('data-content-width="1136"');
			expect(valid).toContain('data-content-height="720"');
			expect(valid).toContain('data-scale-mode="exactFit"');
			expect(valid).toContain('data-orientation="landscape"');
			expect(valid).toContain('data-frame-rate="30"');
			await update(child, () => fs.writeFile(file, 'export default {'), false);
			expect(await html(root)).toBe(valid);
			await update(child, () => fs.writeFile(file, config(0)), false);
			expect(await html(root)).toBe(valid);
			const diagnostic = waitForJsonLine<DevEvent>(child, event => event.type === 'diagnostic');
			await update(child, () => fs.writeFile(file, config(900, 'other-output')), false);
			expect(await diagnostic).toMatchObject({ diagnostic: { code: 'KUROT_CONFIG_RESTART_REQUIRED', message: expect.stringContaining('Restart') } });
			expect(await html(root)).toBe(valid);
			await update(child, () => fs.writeFile(file, config(900)));
			expect(await html(root)).toContain('data-content-width="900"');
			await update(child, () => fs.writeFile(file, config(1136)));
			expect(await html(root)).toContain('data-content-width="1136"');
			expect(child.exitCode).toBeNull();
		} finally {
			await stopCli(child);
		}
	}, 25_000);
});

function config(width: number, output = 'bin-debug'): string {
	return `export default { output: { dir: '${output}' }, stage: { width: ${width}, height: 720, scaleMode: 'exactFit', orientation: 'landscape', frameRate: 30 } };`;
}

async function html(root: string): Promise<string> {
	return fs.readFile(path.join(root, 'bin-debug/index.html'), 'utf8');
}

async function update(child: ChildProcessWithoutNullStreams, action: () => Promise<void>, success = true): Promise<void> {
	const start = waitForJsonLine<DevEvent>(child, event => event.type === 'build-start');
	const complete = waitForJsonLine<DevEvent>(child, event => event.type === 'build-complete');
	await action();
	const events = await Promise.all([start, complete]);
	expect(events[0]).toEqual({ type: 'build-start', reason: 'config-change' });
	expect(events[1]).toMatchObject({ success });
}
