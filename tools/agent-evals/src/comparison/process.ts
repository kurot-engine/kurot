import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import type { ProcessResult } from './types.js';

export async function runProcess(
	command: string, args: readonly string[], cwd: string, prefix: string,
	timeoutMs: number, input?: string,
): Promise<ProcessResult> {
	const started = Date.now();
	const stdout = createWriteStream(`${prefix}.stdout`);
	const stderr = createWriteStream(`${prefix}.stderr`);
	// Do not pass optional API credentials to generated code or the CLI.
	const env: Record<string, string> = {};
	for (const name of ['PATH', 'HOME', 'CODEX_HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'SHELL', 'USER', 'LOGNAME', 'TERM']) {
		const value = process.env[name];
		if (value !== undefined) env[name] = value;
	}
	const child = spawn(command, [...args], { cwd, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
	child.stdout.pipe(stdout);
	child.stderr.pipe(stderr);
	child.stdin.end(input);
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		if (child.pid) process.kill(-child.pid, 'SIGTERM');
	}, timeoutMs);
	const killer = setTimeout(() => {
		if (child.pid) process.kill(-child.pid, 'SIGKILL');
	}, timeoutMs + 5000);
	try {
		const code = await new Promise<number>((resolve, reject) => {
			child.once('error', reject);
			child.once('close', value => resolve(value ?? 1));
		});
		await Promise.all([stdout, stderr].map(stream => new Promise<void>((resolve, reject) => {
			if (stream.writableFinished) resolve();
			else { stream.once('finish', resolve); stream.once('error', reject); }
		})));
		return { code, timedOut, durationMs: Date.now() - started };
	} finally {
		clearTimeout(timer);
		clearTimeout(killer);
	}
}
