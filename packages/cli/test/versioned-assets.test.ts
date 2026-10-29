import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createContext } from '../src/core/pipeline.js';
import { defaultPlugins } from '../src/core/plugins/index.js';
import { versionAssets } from '../src/core/plugins/version-assets.js';
import type { BuildContext } from '../src/core/pipeline.js';
import type { BuildMode, Project } from '../src/core/project.js';
import { writeFile } from '../src/utils/fs.js';

const directories: string[] = [];

afterEach(async () => {
	await Promise.all(directories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })));
});

describe('versioned release assets', () => {
	it('changes the URL for a same-name resource update and keeps the previous release readable', async () => {
		const first = await release('first');
		const second = await release('second');
		const firstUrl = await resourceUrl(first);
		const secondUrl = await resourceUrl(second);
		const cache = new Map([[firstUrl, 'first']]);

		expect(secondUrl).not.toBe(firstUrl);
		cache.set(secondUrl, await resourceContent(second));
		expect(cache.get(secondUrl)).toBe('second');
		expect(await resourceContent(first)).toBe('first');
	});

	it('produces the same version for identical output across release directories', async () => {
		expect(await resourceUrl(await release('same'))).toBe(await resourceUrl(await release('same')));
	});

	it('versions scripts, generated themes, nested assets and page-shell files together', async () => {
		const ctx = await release('image');
		const html = await fs.readFile(path.join(ctx.project.outputDir, 'index.html'), 'utf8');
		const base = basePath(html);
		const manifest = JSON.parse(await fs.readFile(path.join(ctx.project.outputDir, 'manifest.json'), 'utf8')) as {
			initial: string[];
			game: string[];
		};

		expect(base).toMatch(/^\.\/assets\/[a-f0-9]{32}\/$/);
		expect(html.indexOf('<base ')).toBeLessThan(html.indexOf('<script'));
		expect(await fs.readdir(ctx.project.outputDir)).toEqual(['assets', 'index.html', 'manifest.json']);
		for (const file of [
			'js/main.js',
			'js/core.js',
			'js/skins.js',
			'logo.png',
			'resource/default.thm.json',
			'resource/assets/atlas.json',
			'resource/assets/atlas.png',
			'resource/assets/font.fnt',
			'resource/assets/font.png',
		]) {
			expect((await fs.stat(path.join(ctx.project.outputDir, base, file))).isFile()).toBe(true);
		}
		expect(manifest.initial).toEqual([`${base.slice(2)}js/core.js`]);
		expect(manifest.game).toEqual([`${base.slice(2)}js/skins.js`, `${base.slice(2)}js/main.js`]);
		expect(ctx.outputs.entryScript).toBe(manifest.game[1]);
		expect(ctx.outputs.engine['@kurot/core']).toBe(manifest.initial[0]);
	});

	it.each(['theme', 'shell', 'script'])('changes the version when only the %s changes', async kind => {
		const first = await release('same');
		const second = await release('same', { changed: kind });
		expect(await resourceUrl(second)).not.toBe(await resourceUrl(first));
	});

	it.each<[BuildMode, boolean | undefined]>([
		['development', true],
		['release', false],
		['release', undefined],
	])('preserves ordinary paths for %s with versioning %s', async (mode, enabled) => {
		const ctx = await release('same', { mode, enabled });
		const html = await fs.readFile(path.join(ctx.project.outputDir, 'index.html'), 'utf8');
		expect(html).not.toContain('<base ');
		expect(await resourceContent(ctx)).toBe('same');
	});

	it.each(['<html><body></body></html>', '<html><head><base href="/cdn/"></head></html>'])(
		'rejects a conflicting or missing HTML base before moving files: %s',
		async html => {
			const ctx = await release('same', { enabled: false });
			await writeFile(path.join(ctx.project.outputDir, 'index.html'), html);
			const enabled = enableVersioning(ctx);
			await expect(versionAssets().apply(enabled)).rejects.toThrow('output.versionedAssets');
			expect(await fs.readFile(path.join(ctx.project.outputDir, 'resource/assets/atlas.png'), 'utf8')).toBe(
				'same',
			);
		},
	);

	it('ignores commented HTML tags when inserting the base before resource references', async () => {
		const ctx = await release('same', { enabled: false });
		const html =
			'<html><!-- <head><base href="/old/"> --><HEAD data-test="head"><script src="js/main.js"></script></HEAD></html>';
		await writeFile(path.join(ctx.project.outputDir, 'index.html'), html);
		await versionAssets().apply(enableVersioning(ctx));
		const result = await fs.readFile(path.join(ctx.project.outputDir, 'index.html'), 'utf8');
		expect(result).toMatch(/<HEAD data-test="head">\n\t<base href="\.\/assets\/[a-f0-9]{32}\/">/);
	});

	it.each(['"x>y"', "'x>y'"])('inserts the base after a complete head with quoted attribute %s', async value => {
		const ctx = await release('same', { enabled: false });
		const head = '<head data-label=' + value + '>';
		const html = '<!doctype html><html>' + head + '<script src="js/main.js"></script></head></html>';
		await writeFile(path.join(ctx.project.outputDir, 'index.html'), html);

		await versionAssets().apply(enableVersioning(ctx));

		const result = await fs.readFile(path.join(ctx.project.outputDir, 'index.html'), 'utf8');
		const base = '\n\t<base href="' + basePath(result) + '">';
		expect(result).toBe(html.replace(head, head + base));
		expect(await resourceContent(ctx)).toBe('same');
	});

	it.each([
		'<script>const example = \'<base href="./">\';</script>',
		'<style>:root { --example: \'<base href="./">\'; }</style>',
	])('preserves raw text containing base-like markup: %s', async content => {
		const ctx = await release('same', { enabled: false });
		const html = '<!doctype html><html><head>' + content + '</head><body></body></html>';
		await writeFile(path.join(ctx.project.outputDir, 'index.html'), html);

		await versionAssets().apply(enableVersioning(ctx));

		const result = await fs.readFile(path.join(ctx.project.outputDir, 'index.html'), 'utf8');
		const base = '\n\t<base href="' + basePath(result) + '">';
		expect(result).toBe(html.replace('<head>', '<head>' + base));
		expect(await resourceContent(ctx)).toBe('same');
	});
});

function enableVersioning(ctx: BuildContext): BuildContext {
	return {
		...ctx,
		project: {
			...ctx.project,
			config: { ...ctx.project.config, output: { dir: 'output', versionedAssets: true } },
		},
	};
}

interface ReleaseOptions {
	readonly mode?: BuildMode;
	readonly enabled?: boolean;
	readonly changed?: string;
}

async function release(content: string, options: ReleaseOptions = { enabled: true }): Promise<BuildContext> {
	const { mode = 'release', changed } = options;
	const enabled = 'enabled' in options ? options.enabled : true;
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-versioned-assets-'));
	directories.push(root);
	const project: Project = {
		root,
		mode,
		config: {
			target: 'html5',
			entry: 'src/Main.ts',
			output: { dir: 'output', versionedAssets: enabled },
			stage: { width: 640, height: 400, scaleMode: 'showAll', orientation: 'auto', frameRate: 60 },
		},
		entry: path.join(root, 'src/Main.ts'),
		srcDir: path.join(root, 'src'),
		outputDir: path.join(root, 'output'),
		resourceDir: path.join(root, 'resource'),
		enginePackages: [],
		customNamespaces: [],
		components: [],
	};
	const ctx = createContext(project);
	ctx.outputs.entryScript = 'js/main.js';
	ctx.outputs.skinsScript = 'js/skins.js';
	ctx.outputs.engine['@kurot/core'] = 'js/core.js';
	await writeFile(path.join(project.outputDir, 'js/main.js'), changed === 'script' ? 'changed' : 'entry');
	await writeFile(path.join(project.outputDir, 'js/core.js'), 'core');
	await writeFile(path.join(project.outputDir, 'js/skins.js'), 'skins');
	await writeFile(path.join(project.outputDir, 'logo.png'), changed === 'shell' ? 'changed' : 'logo');
	await writeFile(path.join(project.resourceDir, 'assets/atlas.png'), content);
	await writeFile(path.join(project.resourceDir, 'assets/atlas.json'), '{"file":"atlas.png"}');
	await writeFile(path.join(project.resourceDir, 'assets/font.fnt'), 'page id=0 file="font.png"');
	await writeFile(path.join(project.resourceDir, 'assets/font.png'), 'font page');
	await writeFile(path.join(project.resourceDir, 'default.thm.json'), changed === 'theme' ? 'changed' : 'theme');
	const plugins = defaultPlugins();
	const tail = plugins.slice(plugins.findIndex(plugin => plugin.name === 'generate index.html'));
	for (const plugin of tail) {
		await plugin.apply(ctx);
	}
	return ctx;
}

async function resourceUrl(ctx: BuildContext): Promise<string> {
	const html = await fs.readFile(path.join(ctx.project.outputDir, 'index.html'), 'utf8');
	return new URL('resource/assets/atlas.png', new URL(basePath(html), 'https://example.test/game/')).href;
}

async function resourceContent(ctx: BuildContext): Promise<string> {
	const html = await fs.readFile(path.join(ctx.project.outputDir, 'index.html'), 'utf8');
	return fs.readFile(path.join(ctx.project.outputDir, basePath(html), 'resource/assets/atlas.png'), 'utf8');
}

function basePath(html: string): string {
	return /<base href="([^"]+)"/.exec(html)?.[1] ?? './';
}
