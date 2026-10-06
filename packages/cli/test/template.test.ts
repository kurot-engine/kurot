import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseUIStyleSheet } from '@kurot/ui-document';
import { scaffoldProject } from '../src/core/template.js';
import { compileKUI } from '../src/core/kui/index.js';

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
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false })),
		);

		await scaffoldProject('my-game', 'game');

		const project = path.join(root, 'my-game');
		expect((await fs.stat(path.join(project, 'src/components'))).isDirectory()).toBe(true);
		expect((await fs.stat(path.join(project, 'resource/ui/components'))).isDirectory()).toBe(true);
		expect((await fs.stat(path.join(project, 'resource/ui/app'))).isDirectory()).toBe(true);
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

	it('includes usable project fonts, English resources and shared disabled colors', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-template-'));
		temporaryDirs.push(root);
		process.chdir(root);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false })),
		);
		await scaffoldProject('my-game', 'game');
		const project = path.join(root, 'my-game');
		const resourceDir = path.join(project, 'resource');
		const stylesheet = parseUIStyleSheet(
			JSON.parse(await fs.readFile(path.join(resourceDir, 'config/style.json'), 'utf8')),
		);
		expect(stylesheet.colors['disabled-text']).toBe(0x999999);
		for (const family of Object.values(stylesheet.fonts.families)) {
			for (const face of family.faces) {
				const file = await fs.readFile(path.join(resourceDir, face.url));
				expect(file.subarray(0, 4)).toEqual(Buffer.from([0, 1, 0, 0]));
			}
		}
		expect(await fs.readFile(path.join(resourceDir, 'assets/fonts/OFL.txt'), 'utf8')).toContain(
			'SIL OPEN FONT LICENSE Version 1.1',
		);
		const locale = JSON.parse(await fs.readFile(path.join(resourceDir, 'config/locale.json'), 'utf8'));
		expect(locale).toEqual({ locale: [{ code: 'en_US', name: 'English' }], defaultLocale: 'en_US' });
		const manifest = JSON.parse(await fs.readFile(path.join(resourceDir, 'default.res.json'), 'utf8')) as {
			resources: Array<{ name: string; type: string; url: string }>;
			groups: Array<{ name: string; keys: string }>;
		};
		expect(manifest.resources).toEqual(
			expect.arrayContaining([
				{ name: 'locale_json', type: 'json', url: 'config/locale.json' },
				{ name: 'lang_en_US_properties', type: 'text', url: 'lang/lang_en_US.properties' },
			]),
		);
		const preload = manifest.groups.find(group => group.name === 'preload')?.keys.split(',');
		for (const entry of manifest.resources) {
			expect(preload).toContain(entry.name);
			await expect(fs.access(path.join(resourceDir, entry.url))).resolves.toBeUndefined();
		}
		const skinsDirectory = path.join(resourceDir, 'ui/skins');
		for (const filename of await fs.readdir(skinsDirectory)) {
			const source = await fs.readFile(path.join(skinsDirectory, filename), 'utf8');
			expect(source).not.toContain('fontFamily="Tahoma"');
			expect(() => compileKUI(source, undefined, { colors: stylesheet.colors })).not.toThrow();
		}
		const button = await fs.readFile(path.join(skinsDirectory, 'ButtonSkin.kui.xml'), 'utf8');
		expect(compileKUI(button, undefined, { colors: stylesheet.colors })).toContain('"textColor", 10066329');
		const pkg = JSON.parse(await fs.readFile(path.join(project, 'package.json'), 'utf8'));
		expect(pkg.dependencies['@kurot/ui-document']).toBe('latest');
	});

	it('keeps the empty template independent of UI, fonts and language resources', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-template-'));
		temporaryDirs.push(root);
		process.chdir(root);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false })),
		);
		await scaffoldProject('minimal', 'empty');
		const project = path.join(root, 'minimal');
		await expect(fs.access(path.join(project, 'resource/config/style.json'))).rejects.toThrow();
		const pkg = JSON.parse(await fs.readFile(path.join(project, 'package.json'), 'utf8'));
		expect(Object.keys(pkg.dependencies)).toEqual(['@kurot/core']);
	});
});
