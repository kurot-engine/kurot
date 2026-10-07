import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { DevEvent } from '../src/core/diagnostics/index.js';
import { availablePort, createCliProject, startCli, stopCli, waitForJsonLine } from './cli-process-helpers.js';

const roots: string[] = [];
const skin = '<Skin xmlns="https://kurot.dev/ui/1" class="Test"><Label id="label" textColor="@style:colors:foreground" /></Skin>';
const sheet = { file: 'atlas.png', frames: { icon: { x: 0, y: 0, w: 1, h: 1 } } };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4AWP4z8DwHwAFAAH/e+m+7wAAAABJRU5ErkJggg==', 'base64');
const updatedPNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4AWNgYPj/HwADAgH/FAeIXAAAAABJRU5ErkJggg==', 'base64');

afterEach(async () => {
	await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('dev resource synchronization', () => {
	it('synchronizes JSON, PNG, translations and fonts without recompiling skins; mirrors rename and deletion', async () => {
		const root = await project(skin);
		await write(root, 'config/style.json', stylesheet('#123456'));
		await write(root, 'assets/atlas.json', JSON.stringify(sheet));
		await write(root, 'assets/atlas.png', png);
		await write(root, 'config/locale.json', '{"defaultLocale":"en_US"}');
		const port = await availablePort();
		const child = startCli(root, ['dev', '--port', String(port), '--diagnostics', 'jsonl']);
		try {
			await waitForJsonLine<DevEvent>(child, event => event.type === 'server-ready');
			const themePath = path.join(root, 'bin-debug/js/default.thm.js');
			const theme = await fs.readFile(themePath, 'utf8');
			const revised = { ...sheet, frames: { other: sheet.frames.icon } };
			await update(child, async () => {
				await write(root, 'assets/atlas.next', updatedPNG);
				await fs.rename(path.join(root, 'resource/assets/atlas.next'), path.join(root, 'resource/assets/atlas.png'));
				await write(root, 'assets/atlas.json', JSON.stringify(revised));
				await write(root, 'config/locale.json', '{"defaultLocale":"zh_CN"}');
				await write(root, 'lang/zh_CN.properties', 'welcome=你好');
				await write(root, 'fonts/Regular.ttf', Buffer.from([0, 1, 0, 0, 9]));
			}, 'resource-change');
			expect(await fs.readFile(themePath, 'utf8')).toBe(theme);
			for (const file of ['assets/atlas.png', 'assets/atlas.json', 'config/locale.json', 'lang/zh_CN.properties', 'fonts/Regular.ttf']) {
				const response = await fetch(`http://localhost:${port}/resource/${file}`);
				expect(response.status).toBe(200);
				expect(response.headers.get('cache-control')).toBe('no-store');
				expect(Buffer.from(await response.arrayBuffer())).toEqual(await fs.readFile(path.join(root, 'resource', file)));
			}
			expect((await fetch(`http://localhost:${port}/resource/assets/atlas.next`)).status).toBe(404);
			await update(child, async () => {
				await fs.rename(path.join(root, 'resource/assets'), path.join(root, 'resource/renamed'));
				await fs.rm(path.join(root, 'resource/lang'), { recursive: true });
			}, 'resource-change');
			expect((await fetch(`http://localhost:${port}/resource/assets/atlas.png`)).status).toBe(404);
			expect((await fetch(`http://localhost:${port}/resource/lang/zh_CN.properties`)).status).toBe(404);
			expect((await fetch(`http://localhost:${port}/resource/renamed/atlas.png`)).status).toBe(200);
			expect(await fs.readFile(themePath, 'utf8')).toBe(theme);
			expect(await fs.readFile(path.join(root, 'bin-debug/resource/default.thm.json'), 'utf8')).toContain('skinsJs');
		} finally {
			await stopCli(child);
		}
	}, 20_000);

	it('watches a Core-only project even when resource is created after startup or replaced', async () => {
		const root = await project();
		await fs.writeFile(path.join(root, 'kurot.config.ts'), "export default { entry: 'src/Main.ts' };\n");
		await fs.rm(path.join(root, 'resource'), { recursive: true });
		const port = await availablePort();
		const child = startCli(root, ['dev', '--port', String(port), '--diagnostics', 'jsonl']);
		try {
			await waitForJsonLine<DevEvent>(child, event => event.type === 'server-ready');
			await update(child, () => write(root, 'config/locale.json', '{"locale":[]}'), 'resource-change');
			expect(await (await fetch(`http://localhost:${port}/resource/config/locale.json`)).text()).toBe('{"locale":[]}');
			await update(child, () => fs.rm(path.join(root, 'resource'), { recursive: true }), 'resource-change');
			expect((await fetch(`http://localhost:${port}/resource/config/locale.json`)).status).toBe(404);
			await update(child, () => write(root, 'new/settings.json', '{"enabled":true}'), 'resource-change');
			expect(await (await fetch(`http://localhost:${port}/resource/new/settings.json`)).text()).toBe('{"enabled":true}');
		} finally {
			await stopCli(child);
		}
	}, 20_000);

	it('retains style compilation when mixed with asset edits and retries invalid styles before publishing', async () => {
		const root = await project(skin);
		await write(root, 'config/style.json', stylesheet('#123456'));
		await write(root, 'config/locale.json', 'original');
		const child = startCli(root, ['dev', '--port', String(await availablePort()), '--diagnostics', 'jsonl']);
		try {
			await waitForJsonLine<DevEvent>(child, event => event.type === 'server-ready');
			await update(child, async () => {
				await write(root, 'config/style.json', stylesheet('#654321'));
				await write(root, 'config/locale.json', 'updated');
			}, 'kui-change');
			const themePath = path.join(root, 'bin-debug/js/default.thm.js');
			const theme = await fs.readFile(themePath, 'utf8');
			expect(theme).toContain('label.textColor = 6636321');
			await update(child, () => write(root, 'config/style.json', '{'), 'kui-change', false);
			await update(child, () => write(root, 'config/locale.json', 'pending'), 'kui-change', false);
			expect(await fs.readFile(themePath, 'utf8')).toBe(theme);
			expect(await fs.readFile(path.join(root, 'bin-debug/resource/config/locale.json'), 'utf8')).toBe('updated');
			await update(child, () => write(root, 'config/style.json', stylesheet('#000000')), 'kui-change');
			expect(await fs.readFile(themePath, 'utf8')).toContain('label.textColor = 0');
			expect(await fs.readFile(path.join(root, 'bin-debug/resource/config/locale.json'), 'utf8')).toBe('pending');
			expect(child.exitCode).toBeNull();
		} finally {
			await stopCli(child);
		}
	}, 20_000);
});

async function project(source?: string): Promise<string> {
	const root = await createCliProject(source);
	roots.push(root);
	return root;
}

function stylesheet(color: string): string {
	return JSON.stringify({
		schemaVersion: 1,
		fonts: { default: 'primary', families: { primary: { fallback: ['Arial'], faces: [{ url: 'fonts/Regular.ttf', weight: 400 }] } } },
		colors: { foreground: color },
	});
}

async function write(root: string, file: string, bytes: string | Uint8Array): Promise<void> {
	const target = path.join(root, 'resource', file);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, bytes);
}

async function update(
	child: ChildProcessWithoutNullStreams,
	action: () => Promise<void>,
	reason: 'resource-change' | 'kui-change',
	success = true,
): Promise<void> {
	const start = waitForJsonLine<DevEvent>(child, event => event.type === 'build-start');
	const complete = waitForJsonLine<DevEvent>(child, event => event.type === 'build-complete');
	await action();
	const events = await Promise.all([start, complete]);
	expect(events[0]).toEqual({ type: 'build-start', reason });
	expect(events[1]).toEqual(expect.objectContaining({ success }));
}
