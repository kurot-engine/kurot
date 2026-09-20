import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createContext, runPipeline } from '../src/core/pipeline.js';
import { loadProject } from '../src/core/project.js';
import { writeComponentCatalog } from '../src/core/plugins/component-catalog.js';
import { compileCustomNamespaces } from '../src/core/plugins/compile-custom-namespaces.js';
import { compileKUI } from '../src/core/plugins/compile-kui.js';

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

		await runPipeline(ctx, [compileKUI(), compileCustomNamespaces(), writeComponentCatalog()]);

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
		const skinParts = await fs.readFile(path.join(root, '.kurot/skin-parts.d.ts'), 'utf-8');
		expect(skinParts).toContain('from "../src/components/BetButton.js";');
		expect(skinParts).toContain('"skins.HostSkin": {');
		expect(skinParts).toContain('readonly "betButton": SkinPartModule0.BetButton;');
		expect(skinParts).toContain('declare module "../src/components/BetButton.js" {');
		expect(skinParts).toContain(
			'readonly skinParts: import("@kurot/ui").SkinPartsOf<"components.BetButtonSkin">;',
		);
	});
});

async function createFixture(): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-reusable-component-'));
	temporaryDirs.push(root);
	await write(root, 'src/Main.ts', 'export {};\n');
	await write(root, 'src/components/BetButton.ts', 'export class BetButton { public amount = 0; }\n');
	await write(
		root,
		'resource/skins/components/BetButtonSkin.kui.xml',
		'<Skin xmlns="https://kurot.dev/ui/1" id="components.BetButtonSkin" version="2" target="game.BetButton" default="true"><Group id="root"><Label id="label" /></Group></Skin>',
	);
	await write(
		root,
		'resource/skins/HostSkin.kui.xml',
		'<Skin xmlns="https://kurot.dev/ui/1" xmlns:game="https://kurot.dev/components/game" id="skins.HostSkin" version="2" target="kui.Panel"><contract><parts><part name="betButton" node="betButton" /></parts></contract><Group id="root"><game:BetButton id="betButton" /></Group></Skin>',
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
			ui: {
				sourceDir: 'resource/skins',
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
