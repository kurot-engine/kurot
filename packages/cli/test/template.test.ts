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
		expect((await fs.stat(path.join(project, 'resource/ui/components'))).isDirectory()).toBe(true);
		expect((await fs.stat(path.join(project, 'resource/ui/skins/ButtonSkin.kui.xml'))).isFile()).toBe(true);
		expect((await fs.stat(path.join(project, 'resource/assets/ui/eui/eui.json'))).isFile()).toBe(true);
		expect((await fs.stat(path.join(project, 'resource/assets/ui/eui/eui.png'))).isFile()).toBe(true);
		await expect(fs.access(path.join(project, 'resource/assets/eui.json'))).rejects.toThrow();
		await expect(fs.access(path.join(project, 'resource/assets/eui.png'))).rejects.toThrow();
		await expect(fs.access(path.join(project, 'resource/ui/ButtonSkin.kui.xml'))).rejects.toThrow();
		await expect(fs.access(path.join(project, 'src/game-components.ts'))).rejects.toThrow();
		const resources = await fs.readFile(path.join(project, 'resource/default.res.json'), 'utf-8');
		expect(resources).toContain('"url": "assets/ui/eui/eui.json"');
		const config = await fs.readFile(path.join(project, 'kurot.config.ts'), 'utf-8');
		expect(config).toContain("sourceDir: 'src/components'");
		expect(config).toContain("sourceDir: 'resource/ui'");
		expect(config).toContain("skinDir: 'resource/ui/components'");
		const tsconfig = await fs.readFile(path.join(project, 'tsconfig.json'), 'utf-8');
		expect(tsconfig).toContain('".kurot/**/*.d.ts"');
		const gitignore = await fs.readFile(path.join(project, '.gitignore'), 'utf-8');
		expect(gitignore).toContain('.kurot/');
	});
});
