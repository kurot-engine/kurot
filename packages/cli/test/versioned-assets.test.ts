import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createContext } from '../src/core/pipeline.js';
import { versionResources } from '../src/core/plugins/version-resources.js';
import type { BuildContext } from '../src/core/pipeline.js';
import type { BuildMode, Project } from '../src/core/project.js';
import { writeFile } from '../src/utils/fs.js';

const directories: string[] = [];
const html = '<html><head><script type="importmap">{"imports":{"@kurot/core":"./js/core.min_HASH.js"}}</script>' +
	'<link rel="stylesheet" href="site.css"></head><body>' +
	'<img src="resource/atlas.png?size=2#frame"><a href="entrance.html">Enter</a>' +
	'<script src="Conf.js"></script><script type="module" src="js/main.min_HASH.js"></script></body></html>';

afterEach(async () => {
	await Promise.all(directories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })));
});

describe('release resource versions', () => {
	it('retains generated JS paths, bytes and manifest while publishing the release build number', async () => {
		const ctx = await fixture();
		await versionResources().apply(ctx);
		const result = await read(ctx, 'index.html');
		expect(result).toContain('<meta name="kurot-resource-version" content="261030123456">');
		expect(result).not.toContain('<base');
		expect(result).toContain('"@kurot/core":"./js/core.min_HASH.js"');
		expect(result).toContain('src="js/main.min_HASH.js"');
		expect(await read(ctx, 'js/main.min_HASH.js')).toBe('main');
		expect(await read(ctx, 'manifest.json')).toBe('{"initial":["js/core.min_HASH.js"],"game":["js/main.min_HASH.js"]}');
		expect(ctx.outputs.entryScript).toBe('js/main.min_HASH.js');
		expect(await fs.readdir(ctx.project.outputDir)).not.toContain('assets');
	});

	it('versions static resources and shell assets while retaining navigation', async () => {
		const ctx = await fixture();
		await versionResources().apply(ctx);
		const result = await read(ctx, 'index.html');
		expect(result).toContain('src="resource/atlas.png?size=2&amp;v=261030123456#frame"');
		expect(result).toContain('href="site.css?v=261030123456"');
		expect(result).toContain('src="Conf.js?v=261030123456"');
		expect(result).toContain('href="entrance.html"');
		expect(await read(ctx, 'entrance.html')).toContain('name="kurot-resource-version"');
		expect(await read(ctx, 'entrance.html')).toContain('action="./"');
		expect(await read(ctx, 'resource/atlas.png')).toBe('image');
	});

	it('parses CSS URLs and imports while preserving comments, data and remote URLs', async () => {
		const ctx = await fixture();
		await write(ctx, 'other.css', 'body{}');
		await write(ctx, 'site.css', '@import "other.css"; /* url(resource/atlas.png) */\n' +
			'@font-face{src:url("resource/text.ttf?x=2&v=old#font")}\n' +
			'.a{background:url(resource/atlas.png);--text:"url(resource/atlas.png)";' +
			'--data:url(data:image/png;base64,AA);--remote:url(https://cdn.example/image.png)}');
		await versionResources().apply(ctx);
		const css = await read(ctx, 'site.css');
		expect(css).toContain('@import "other.css?v=261030123456"');
		expect(css).toContain('/* url(resource/atlas.png) */');
		expect(css).toContain('resource/text.ttf?x=2&v=261030123456#font');
		expect(css).toContain('url(resource/atlas.png?v=261030123456)');
		expect(css).toContain('--text:"url(resource/atlas.png)"');
		expect(css).toContain('url(data:image/png;base64,AA)');
		expect(css).toContain('url(https://cdn.example/image.png)');
	});

	it('versions inline CSS and SVG references without touching script contents', async () => {
		const ctx = await fixture();
		await write(ctx, 'index.html', '<html><head><style>.a{background:url(resource/atlas.png)}</style>' +
			'<script>const text=\'<base href="/old/">\';</script></head><body>' +
			'<div style="background:url(resource/atlas.png)"></div>' +
			'<svg><image href="resource/atlas.png"/></svg></body></html>');
		await versionResources().apply(ctx);
		const result = await read(ctx, 'index.html');
		expect(result).toContain('url(resource/atlas.png?v=261030123456)');
		expect(result).toContain('href="resource/atlas.png?v=261030123456"');
		expect(result).toContain('<script>const text=\'<base href="/old/">\';</script>');
	});

	it('uses the release stamp rather than file contents, keeping JS independently cached', async () => {
		const first = await fixture();
		const second = await fixture({ stamp: '261030123457' });
		await versionResources().apply(first);
		await versionResources().apply(second);
		expect(await read(first, 'index.html')).not.toBe(await read(second, 'index.html'));
		expect(await read(first, 'manifest.json')).toBe(await read(second, 'manifest.json'));
		expect(await read(first, 'js/main.min_HASH.js')).toBe(await read(second, 'js/main.min_HASH.js'));
	});

	it.each<[BuildMode, boolean | undefined]>([
		['development', true], ['release', false], ['release', undefined],
	])('leaves %s output unchanged when enabled=%s', async (mode, enabled) => {
		const ctx = await fixture({ mode, enabled });
		await versionResources().apply(ctx);
		expect(await read(ctx, 'index.html')).toBe(html);
		expect(await read(ctx, 'site.css')).toBe('.a{background:url(resource/atlas.png)}');
	});

	it.each(['"x>y"', "'x>y'"])('handles an authored head containing quoted %s', async value => {
		const ctx = await fixture();
		const head = '<head data-label=' + value + '>';
		await write(ctx, 'index.html', `<html>${head}<script>const value="<base>";</script></head></html>`);
		await versionResources().apply(ctx);
		expect(await read(ctx, 'index.html')).toContain(head + '\n\t<meta name="kurot-resource-version"');
	});

	it.each([
		'<html><body></body></html>',
		'<html><head><meta name="kurot-resource-version" content="old"></head></html>',
		'<html><head><base href="/old/"></head></html>',
	])(
		'rejects ambiguous build metadata before updating any files: %s', async invalid => {
			const ctx = await fixture();
			await write(ctx, 'invalid.html', invalid);
			await expect(versionResources().apply(ctx)).rejects.toThrow('output.versionedAssets');
			expect(await read(ctx, 'index.html')).toBe(html);
			expect(await read(ctx, 'site.css')).toBe('.a{background:url(resource/atlas.png)}');
		},
	);

	it('handles escaped and quoted font filenames with spaces', async () => {
		const ctx = await fixture();
		await write(ctx, 'resource/text font.ttf', 'font');
		await write(ctx, 'site.css', String.raw`.a{src:url(resource/text\ font.ttf)} .b{src:url("resource/text font.ttf")}`);
		await versionResources().apply(ctx);
		expect(await read(ctx, 'site.css')).toContain(String.raw`url(resource/text\ font.ttf?v=261030123456)`);
		expect(await read(ctx, 'site.css')).toContain('url("resource/text font.ttf?v=261030123456")');
	});
});

async function fixture(options: { mode?: BuildMode; enabled?: boolean; stamp?: string } = {}): Promise<BuildContext> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-resource-version-'));
	directories.push(root);
	const project: Project = {
		root, mode: options.mode ?? 'release',
		config: {
			target: 'html5', entry: 'src/Main.ts',
			output: { dir: 'bin-debug', versionedAssets: 'enabled' in options ? options.enabled : true },
			stage: { width: 640, height: 1136, scaleMode: 'showAll', orientation: 'auto', frameRate: 60 },
		},
		entry: path.join(root, 'src/Main.ts'), srcDir: path.join(root, 'src'),
		outputDir: path.join(root, options.stamp ?? '261030123456'), resourceDir: path.join(root, 'resource'),
		enginePackages: [], customNamespaces: [], components: [],
	};
	const ctx = createContext(project);
	ctx.outputs.entryScript = 'js/main.min_HASH.js';
	ctx.outputs.engine['@kurot/core'] = 'js/core.min_HASH.js';
	await write(ctx, 'index.html', html);
	await write(ctx, 'manifest.json', '{"initial":["js/core.min_HASH.js"],"game":["js/main.min_HASH.js"]}');
	await write(ctx, 'js/main.min_HASH.js', 'main');
	await write(ctx, 'js/core.min_HASH.js', 'core');
	await write(ctx, 'resource/atlas.png', 'image');
	await write(ctx, 'resource/text.ttf', 'font');
	await write(ctx, 'Conf.js', 'configuration');
	await write(ctx, 'entrance.html', '<html><head></head><body><form action="./"></form></body></html>');
	await write(ctx, 'site.css', '.a{background:url(resource/atlas.png)}');
	return ctx;
}

async function read(ctx: BuildContext, file: string): Promise<string> {
	return fs.readFile(path.join(ctx.project.outputDir, file), 'utf8');
}

async function write(ctx: BuildContext, file: string, contents: string): Promise<void> {
	await writeFile(path.join(ctx.project.outputDir, file), contents);
}
