import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createContext } from '../src/core/pipeline.js';
import { compileKUI } from '../src/core/plugins/compile-kui.js';
import { DIAGNOSTIC_CODES } from '../src/core/diagnostics/index.js';
import { createPartFieldProject, writePartFile } from './helpers/part-field-project.js';

const temporary: string[] = [];

afterEach(async () => {
	await Promise.all(temporary.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('skin part field diagnostics in the build pipeline', () => {
	it.each(['development', 'release'] as const)('retains last good outputs and clears fixed diagnostics (%s)', async mode => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-part-pipeline-'));
		temporary.push(root);
		const source = `
import { Component, Button } from '@kurot/ui';
export class View extends Component<'skins.ViewSkin'> { declare btnClose: Button; }
`;
		const base = await createPartFieldProject(root, source);
		const context = createContext({ ...base, mode,
			uiSourceDir: path.join(root, 'resource/ui'),
			config: { ...base.config, ui: { sourceDir: 'resource/ui' } },
		});
		const xml = '<Skin xmlns="https://kurot.dev/ui/1" class="skins.ViewSkin"><Button id="btnClose" label="first" /></Skin>';
		await writePartFile(root, 'resource/ui/ViewSkin.kui.xml', xml);
		await compileKUI().apply(context);
		const script = context.outputs.skinsScript;
		expect(script).toBeDefined();
		if (!script) {
			throw new Error('Missing compiled skin script.');
		}
		const previous = await fs.readFile(path.join(base.outputDir, script), 'utf8');
		const declaration = await fs.readFile(path.join(root, '.kurot/skin-parts.d.ts'), 'utf8');
		const filenames = await fs.readdir(path.join(base.outputDir, 'js'));
		await writePartFile(root, 'src/View.ts', source.replace('declare btnClose: Button;', 'declare btnClose: Component;\n  declare missing: Button;'));
		await writePartFile(root, 'resource/ui/ViewSkin.kui.xml', xml.replace('first', 'changed'));
		await expect(compileKUI().apply(context)).rejects.toThrow('KUI input validation failed');
		expect(await fs.readFile(path.join(base.outputDir, script), 'utf8')).toBe(previous);
		expect(await fs.readFile(path.join(root, '.kurot/skin-parts.d.ts'), 'utf8')).toBe(declaration);
		expect(await fs.readdir(path.join(base.outputDir, 'js'))).toEqual(filenames);
		expect(context.diagnostics.all().some(diagnostic =>
			diagnostic.code === DIAGNOSTIC_CODES.KUI_PART_BINDING_INVALID && diagnostic.location?.line === 4,
		)).toBe(true);

		await writePartFile(root, 'src/View.ts', source);
		await compileKUI().apply(context);
		expect(context.diagnostics.all().some(diagnostic => diagnostic.code === DIAGNOSTIC_CODES.KUI_PART_BINDING_INVALID)).toBe(false);
	});
});
