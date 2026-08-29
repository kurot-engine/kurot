import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createContext, runPipeline } from '../src/core/pipeline.js';
import { loadProject } from '../src/core/project.js';
import { writeComponentCatalog } from '../src/core/plugins/component-catalog.js';
import { compileCustomNamespaces } from '../src/core/plugins/compile-custom-namespaces.js';
import { compileExml } from '../src/core/plugins/compile-exml.js';

const originalCwd = process.cwd();
const temporaryDirs: string[] = [];

afterEach(async () => {
	process.chdir(originalCwd);
	await Promise.all(temporaryDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('reusable component build', () => {
	it('discovers, validates, compiles, maps, and catalogs a complete component pair', async () => {
		const root = await createFixture();
		process.chdir(root);
		const project = await loadProject('development');
		const ctx = createContext(project);

		await runPipeline(ctx, [compileExml(), compileCustomNamespaces(), writeComponentCatalog()]);

		expect(ctx.diagnostics.all()).toEqual([]);
		expect(project.components.map(component => component.name)).toEqual(['BetButton']);
		const skinBundle = await fs.readFile(path.join(project.outputDir, ctx.outputs.skinsScript ?? 'missing'), 'utf-8');
		expect(skinBundle).toContain('#ns/game');
		expect(skinBundle).toContain('new BetButton()');
		const namespaceBundle = await fs.readFile(path.join(project.outputDir, 'js/ns.game.js'), 'utf-8');
		expect(namespaceBundle).toContain('BetButton');
		const theme = JSON.parse(
			await fs.readFile(path.join(project.outputDir, 'resource/default.thm.json'), 'utf-8'),
		) as { skins: Record<string, string> };
		expect(theme.skins.BetButton).toBe('components.BetButtonSkin');
		const catalog = JSON.parse(
			await fs.readFile(path.join(project.outputDir, '.kurot/component-catalog.json'), 'utf-8'),
		) as { components: Array<{ tag: string }> };
		expect(catalog.components).toEqual([expect.objectContaining({ tag: 'game:BetButton' })]);
	});
});

async function createFixture(): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-reusable-component-'));
	temporaryDirs.push(root);
	await write(root, 'src/Main.ts', 'export {};\n');
	await write(root, 'src/components/BetButton.ts', 'export class BetButton { public amount = 0; }\n');
	await write(
		root,
		'resource/skins/components/BetButtonSkin.exml',
		'<eui:Skin class="components.BetButtonSkin" xmlns:eui="http://ns.egret.com/eui"><eui:Label/></eui:Skin>',
	);
	await write(
		root,
		'resource/skins/HostSkin.exml',
		'<eui:Skin class="skins.HostSkin" xmlns:eui="http://ns.egret.com/eui" xmlns:game="game.*"><game:BetButton/></eui:Skin>',
	);
	await write(
		root,
		'resource/default.thm.json',
		JSON.stringify({ skins: {}, autoGenerateExmlsList: true }),
	);
	await write(
		root,
		'kurot.config.ts',
		`export default ${JSON.stringify({
			target: 'html5',
			entry: 'src/Main.ts',
			output: { dir: 'bin-debug' },
			stage: {
				width: 640,
				height: 1136,
				scaleMode: 'showAll',
				orientation: 'auto',
				frameRate: 60,
			},
			exml: {
				themeFile: 'resource/default.thm.json',
				components: {
					namespace: 'game',
					sourceDir: 'src/components',
					skinDir: 'resource/skins/components',
				},
			},
		})};\n`,
	);
	return root;
}

async function write(root: string, relative: string, source: string): Promise<void> {
	const file = path.join(root, relative);
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(file, source);
}
