import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createContext, disposeContext } from '../src/core/pipeline.js';
import { compileKUI } from '../src/core/plugins/compile-kui.js';
import { compileSource } from '../src/core/plugins/compile-source.js';
import { rebuildSkinPartSources } from '../src/core/kui/skin-part-watch.js';
import { DIAGNOSTIC_CODES } from '../src/core/diagnostics/index.js';
import { createPartFieldProject, writePartFile } from './helpers/part-field-project.js';

const temporary: string[] = [];

afterEach(async () => {
	await Promise.all(temporary.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

describe('skin part field source watching', () => {
	it('blocks invalid source output and retries it after a KUI-only correction', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-part-watch-'));
		temporary.push(root);
		const source = `
import { Component, Button, Label } from '@kurot/ui';
export class View extends Component<'skins.ViewSkin'> { declare btnClose: Button; }
`;
		const base = await createPartFieldProject(root, source);
		const ctx = createContext({ ...base, uiSourceDir: path.join(root, 'resource/ui'),
			config: { ...base.config, ui: { sourceDir: 'resource/ui' } },
		}, { watch: true });
		const xml = '<Skin xmlns="https://kurot.dev/ui/1" class="skins.ViewSkin"><Button id="btnClose" /></Skin>';
		await writePartFile(root, 'resource/ui/ViewSkin.kui.xml', xml);
		try {
			await compileKUI().apply(ctx);
			await compileSource().apply(ctx);
			await ctx.outputs.sourceRebuilder?.();
			const output = path.join(base.outputDir, 'View.js');
			const previous = await fs.readFile(output, 'utf8');
			const declarationFile = path.join(root, '.kurot/skin-parts.d.ts');
			const previousDeclaration = await fs.readFile(declarationFile, 'utf8');
			await writePartFile(root, 'src/View.ts', source.replace('declare btnClose: Button;', "declare btnClose: Label; marker = 'changed';"));
			await expect(ctx.outputs.sourceRebuilder?.()).rejects.toThrow('KUROT_KUI_PART_BINDING_INVALID');
			expect(await fs.readFile(output, 'utf8')).toBe(previous);
			expect(await fs.readFile(declarationFile, 'utf8')).toBe(previousDeclaration);
			expect(ctx.diagnostics.all().some(diagnostic => diagnostic.code === DIAGNOSTIC_CODES.KUI_PART_BINDING_INVALID)).toBe(true);

			await writePartFile(root, 'resource/ui/ViewSkin.kui.xml', xml.replace('<Button ', '<Label '));
			await compileKUI().apply(ctx);
			await rebuildSkinPartSources(ctx);
			expect(await fs.readFile(output, 'utf8')).toContain('changed');
			expect(ctx.diagnostics.all().some(diagnostic => diagnostic.code === DIAGNOSTIC_CODES.KUI_PART_BINDING_INVALID)).toBe(false);
		} finally {
			await disposeContext(ctx);
		}
	});
});
