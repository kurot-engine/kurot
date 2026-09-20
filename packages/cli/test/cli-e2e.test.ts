import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DIAGNOSTIC_CODES } from '../src/core/diagnostics/index.js';
import type { BuildResultOutput, DevEvent } from '../src/core/diagnostics/index.js';
import {
	availablePort,
	createCliProject,
	runCli,
	startCli,
	stopCli,
	waitForJsonLine,
} from './cli-process-helpers.js';

const projects: string[] = [];
const validSkin = '<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin"><Group id="root"><Button id="button" /></Group></Skin>';
const unknownSkin = validSkin.replace('<Button id="button" />', '<Buton id="button" />');
const malformedSkin = validSkin.replace('</Group>', '</Button>');

afterEach(async () => {
	await Promise.all(projects.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('CLI process diagnostics', () => {
	it('preserves human build output', async () => {
		const root = await project(validSkin);
		const result = await runCli(root, ['build']);

		expect(result.exitCode, result.stderr).toBe(0);
		expect(result.stdout).toContain('Building (development)...');
		expect(result.stdout).toContain('Build completed');
	});

	it('emits a parseable JSON success result', async () => {
		const root = await project(validSkin);
		const result = await runCli(root, ['build', '--diagnostics', 'json']);
		expect(result.stdout, result.stderr).not.toBe('');
		const output = JSON.parse(result.stdout) as BuildResultOutput;

		expect(result.exitCode).toBe(0);
		expect(output).toEqual(expect.objectContaining({ success: true, command: 'build', mode: 'development' }));
		expect(output.diagnostics).toEqual([]);
		expect(result.stdout).not.toContain('\u001b');
	});

	it('reports unknown tags as warnings normally and errors under strict mode', async () => {
		const normalRoot = await project(unknownSkin);
		const strictRoot = await project(unknownSkin);
		const normal = await runCli(normalRoot, ['build', '--diagnostics', 'json']);
		const strict = await runCli(strictRoot, ['build', '--strict', '--diagnostics', 'json']);

		expect(normal.exitCode).toBe(0);
		expect(diagnostic(normal).severity).toBe('warning');
		expect(strict.exitCode).toBe(1);
		expect(diagnostic(strict)).toEqual(expect.objectContaining({
			code: DIAGNOSTIC_CODES.KUI_UNKNOWN_TAG,
			severity: 'error',
			suggestions: ['Did you mean "Button"?'],
		}));

		await fs.writeFile(path.join(strictRoot, 'resource/skins/TestSkin.kui.xml'), unknownSkin.replace('Buton', 'Button'));
		const repaired = await runCli(strictRoot, ['build', '--strict', '--diagnostics', 'json']);
		expect(repaired.exitCode).toBe(0);
		expect((JSON.parse(repaired.stdout) as BuildResultOutput).diagnostics).toEqual([]);
	});

	it('fails for malformed KUI with its stable diagnostic code', async () => {
		const root = await project(malformedSkin);
		const result = await runCli(root, ['build', '--diagnostics', 'json']);

		expect(result.exitCode).toBe(1);
		expect(diagnostic(result).code).toBe(DIAGNOSTIC_CODES.KUI_COMPILE_FAILED);
	});


	it('emits JSONL initial-build and server-ready events', async () => {
		const root = await project(validSkin);
		const port = await availablePort();
		const child = startCli(root, ['dev', '--port', String(port), '--diagnostics', 'jsonl']);
		try {
			const completePromise = waitForJsonLine<DevEvent>(child, event => event.type === 'build-complete');
			const readyPromise = waitForJsonLine<DevEvent>(child, event => event.type === 'server-ready');
			const [complete, ready] = await Promise.all([completePromise, readyPromise]);
			expect(complete).toEqual(expect.objectContaining({ type: 'build-complete', success: true }));
			expect(ready).toEqual({ type: 'server-ready', url: `http://localhost:${port}` });
		} finally {
			await stopCli(child);
		}
	});

	it('keeps dev alive after a KUI failure and recovers after the file is fixed', async () => {
		const root = await project(validSkin);
		const port = await availablePort();
		const child = startCli(root, ['dev', '--port', String(port), '--diagnostics', 'jsonl']);
		try {
			await waitForJsonLine<DevEvent>(child, event => event.type === 'server-ready');
			const skinPath = path.join(root, 'resource/skins/TestSkin.kui.xml');
			const failed = waitForJsonLine<DevEvent>(child, event => event.type === 'build-complete' && !event.success);
			await fs.writeFile(skinPath, malformedSkin);
			await expect(failed).resolves.toEqual(expect.objectContaining({ success: false }));
			const recovered = waitForJsonLine<DevEvent>(child, event => event.type === 'build-complete' && event.success);
			await fs.writeFile(skinPath, validSkin.replace('/>', ' label="Recovered"/>'));
			await expect(recovered).resolves.toEqual(expect.objectContaining({ success: true }));
			expect(child.exitCode).toBeNull();
		} finally {
			await stopCli(child);
		}
	});
});

async function project(skin?: string): Promise<string> {
	const root = await createCliProject(skin);
	projects.push(root);
	return root;
}

function diagnostic(result: { stdout: string }): BuildResultOutput['diagnostics'][number] {
	const output = JSON.parse(result.stdout) as BuildResultOutput;
	const first = output.diagnostics[0];
	if (!first) throw new Error('Expected a diagnostic');
	return first;
}
