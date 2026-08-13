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
const validTheme = JSON.stringify({ skins: { Button: 'resource/skins/TestSkin.exml' } });
const validSkin = '<eui:Skin class="skins.TestSkin" xmlns:eui="http://ns.egret.com/eui"><eui:Button/></eui:Skin>';
const unknownSkin = '<eui:Skin class="skins.TestSkin" xmlns:eui="http://ns.egret.com/eui"><eui:Buton/></eui:Skin>';
const malformedSkin = '<eui:Skin class="skins.TestSkin" xmlns:eui="http://ns.egret.com/eui"><eui:Button></eui:Skin>';

afterEach(async () => {
	await Promise.all(projects.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('CLI process diagnostics', () => {
	it('preserves human build output', async () => {
		const root = await project(validTheme, validSkin);
		const result = await runCli(root, ['build']);

		expect(result.exitCode, result.stderr).toBe(0);
		expect(result.stdout).toContain('Building (development)...');
		expect(result.stdout).toContain('Build completed');
	});

	it('emits a parseable JSON success result', async () => {
		const root = await project(validTheme, validSkin);
		const result = await runCli(root, ['build', '--diagnostics', 'json']);
		expect(result.stdout, result.stderr).not.toBe('');
		const output = JSON.parse(result.stdout) as BuildResultOutput;

		expect(result.exitCode).toBe(0);
		expect(output).toEqual(expect.objectContaining({ success: true, command: 'build', mode: 'development' }));
		expect(output.diagnostics).toEqual([]);
		expect(result.stdout).not.toContain('\u001b');
	});

	it('reports unknown tags as warnings normally and errors under strict mode', async () => {
		const normalRoot = await project(validTheme, unknownSkin);
		const strictRoot = await project(validTheme, unknownSkin);
		const normal = await runCli(normalRoot, ['build', '--diagnostics', 'json']);
		const strict = await runCli(strictRoot, ['build', '--strict', '--diagnostics', 'json']);

		expect(normal.exitCode).toBe(0);
		expect(diagnostic(normal).severity).toBe('warning');
		expect(strict.exitCode).toBe(1);
		expect(diagnostic(strict)).toEqual(expect.objectContaining({
			code: DIAGNOSTIC_CODES.EXML_UNKNOWN_TAG,
			severity: 'error',
			suggestions: ['Did you mean "eui:Button"?'],
		}));

		await fs.writeFile(path.join(strictRoot, 'resource/skins/TestSkin.exml'), unknownSkin.replace('Buton', 'Button'));
		const repaired = await runCli(strictRoot, ['build', '--strict', '--diagnostics', 'json']);
		expect(repaired.exitCode).toBe(0);
		expect((JSON.parse(repaired.stdout) as BuildResultOutput).diagnostics).toEqual([]);
	});

	it('fails for malformed EXML with its stable diagnostic code', async () => {
		const root = await project(validTheme, malformedSkin);
		const result = await runCli(root, ['build', '--diagnostics', 'json']);

		expect(result.exitCode).toBe(1);
		expect(diagnostic(result).code).toBe(DIAGNOSTIC_CODES.EXML_COMPILE_FAILED);
	});

	it('distinguishes a missing theme from invalid theme JSON', async () => {
		const missingRoot = await project(undefined, validSkin);
		const invalidRoot = await project('{ invalid', validSkin);
		const missing = await runCli(missingRoot, ['build', '--diagnostics', 'json']);
		const invalid = await runCli(invalidRoot, ['build', '--diagnostics', 'json']);

		expect(missing.exitCode).toBe(0);
		expect(diagnostic(missing).code).toBe(DIAGNOSTIC_CODES.THEME_FILE_NOT_FOUND);
		expect(invalid.exitCode).toBe(1);
		expect(diagnostic(invalid).code).toBe(DIAGNOSTIC_CODES.THEME_INVALID_JSON);
	});

	it('emits JSONL initial-build and server-ready events', async () => {
		const root = await project(validTheme, validSkin);
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

	it('keeps dev alive after an EXML failure and recovers after the file is fixed', async () => {
		const root = await project(validTheme, validSkin);
		const port = await availablePort();
		const child = startCli(root, ['dev', '--port', String(port), '--diagnostics', 'jsonl']);
		try {
			await waitForJsonLine<DevEvent>(child, event => event.type === 'server-ready');
			const skinPath = path.join(root, 'resource/skins/TestSkin.exml');
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

async function project(theme?: string, skin?: string): Promise<string> {
	const root = await createCliProject(theme, skin);
	projects.push(root);
	return root;
}

function diagnostic(result: { stdout: string }): BuildResultOutput['diagnostics'][number] {
	const output = JSON.parse(result.stdout) as BuildResultOutput;
	const first = output.diagnostics[0];
	if (!first) throw new Error('Expected a diagnostic');
	return first;
}
