import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scaffoldProject } from '../src/core/template.js';

const originalCwd = process.cwd();
const temporaryDirs: string[] = [];

afterEach(async () => {
	process.chdir(originalCwd);
	vi.unstubAllGlobals();
	await Promise.all(temporaryDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('game template components', () => {
	it('creates empty component directories without a manual namespace barrel', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-template-'));
		temporaryDirs.push(root);
		process.chdir(root);
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));

		await scaffoldProject('my-game', 'game');

		const project = path.join(root, 'my-game');
		expect((await fs.stat(path.join(project, 'src/components'))).isDirectory()).toBe(true);
		expect((await fs.stat(path.join(project, 'resource/skins/components'))).isDirectory()).toBe(true);
		expect((await fs.stat(path.join(project, 'resource/skins/eui/ButtonSkin.exml'))).isFile()).toBe(true);
		await expect(fs.access(path.join(project, 'resource/skins/ButtonSkin.exml'))).rejects.toThrow();
		await expect(fs.access(path.join(project, 'src/game-components.ts'))).rejects.toThrow();
		const config = await fs.readFile(path.join(project, 'kurot.config.ts'), 'utf-8');
		expect(config).toContain("sourceDir: 'src/components'");
		expect(config).toContain("skinDir: 'resource/skins/components'");
	});
});
