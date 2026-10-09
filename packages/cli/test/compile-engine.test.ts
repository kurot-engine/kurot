import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createContext } from '../src/core/pipeline.js';
import { compileEngine } from '../src/core/plugins/compile-engine.js';
import type { Project } from '../src/core/project.js';

const temporaryDirs: string[] = [];

afterEach(async () => {
	await Promise.all(temporaryDirs.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('engine names used by default themes', () => {
	it.each(['development', 'release'] as const)('keeps a self-referencing Scroller name in %s output', async mode => {
		const root = await mkdtemp(join(tmpdir(), 'kurot-engine-names-'));
		temporaryDirs.push(root);
		const sdk = join(root, 'node_modules/@kurot/ui');
		await mkdir(sdk, { recursive: true });
		await writeFile(join(root, 'package.json'), '{"type":"module"}');
		await writeFile(join(sdk, 'package.json'), '{"type":"module","exports":"./index.js"}');
		await writeFile(join(sdk, 'index.js'), 'export class Scroller { static create() { return new Scroller(); } }');
		const project: Project = {
			root, mode,
			config: {
				target: 'html5', entry: 'src/Main.ts', output: { dir: 'bin' },
				stage: { width: 640, height: 1136, scaleMode: 'showAll', orientation: 'auto', frameRate: 60 },
			},
			entry: join(root, 'src/Main.ts'), srcDir: join(root, 'src'),
			outputDir: join(root, 'bin'), resourceDir: join(root, 'resource'),
			enginePackages: ['@kurot/ui'], customNamespaces: [], components: [],
		};
		const context = createContext(project);
		await compileEngine().apply(context);
		const output = context.outputs.engine['@kurot/ui'];
		if (!output) throw new Error('Missing engine output');
		const sdkModule = await import(pathToFileURL(join(project.outputDir, output)).href) as {
			Scroller: { name: string; create: () => { constructor: { name: string } } };
		};
		const theme = new Map([['Scroller', 'skins.ScrollerSkin']]);
		expect(theme.get(sdkModule.Scroller.name)).toBe('skins.ScrollerSkin');
		expect(theme.get(sdkModule.Scroller.create().constructor.name)).toBe('skins.ScrollerSkin');
	});
});
