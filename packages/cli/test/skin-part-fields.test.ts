import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseToIR } from '../src/core/kui/index.js';
import { generateSkinPartsDeclaration } from '../src/core/kui/skin-parts-declaration.js';
import { validateSkinPartFields } from '../src/core/kui/validate-skin-part-fields.js';
import { createPartFieldProject, writePartFile } from './helpers/part-field-project.js';

const temporary: string[] = [];

afterEach(async () => {
	await Promise.all(temporary.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

async function check(body: string, appearance = '<Button id="btnClose" />', extra = ''): Promise<readonly string[]> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-part-fields-'));
	temporary.push(root);
	const project = await createPartFieldProject(root, `
import { Component, Button, Label } from '@kurot/ui';
${extra}
export class View extends Component<'skins.ViewSkin'> { ${body} }
`);
	const skins = [parseToIR(`<Skin xmlns="https://kurot.dev/ui/1" class="skins.ViewSkin">${appearance}</Skin>`)];
	return (await validateSkinPartFields(project, skins, await generateSkinPartsDeclaration(project, skins)))
		.map(issue => issue.message);
}

describe('declared skin part field validation', () => {
	it('accepts declare fields with exact or broader assignable types', async () => {
		expect(await check('declare btnClose: Button;')).toEqual([]);
		expect(await check('declare btnClose: Component;')).toEqual([]);
	});

	it('rejects a field type that cannot receive the authored part', async () => {
		expect((await check('declare btnClose: Label;')).join('\n')).toMatch(/btnClose.*(?:type|assign)/i);
	});

	it('rejects required declarations that have no matching authored part', async () => {
		expect((await check('declare btnTypo: Button;')).join('\n')).toMatch(/btnTypo.*missing/i);
	});

	it('accepts absent optional part declarations', async () => {
		expect(await check('declare optional?: Button;')).toEqual([]);
	});

	it('rejects emitted fields and initializers that could overwrite a skin binding', async () => {
		expect((await check('btnClose?: Button;')).join('\n')).toMatch(/btnClose.*declare/i);
		expect((await check('btnClose = new Button();')).join('\n')).toMatch(/btnClose.*declare/i);
	});

	it('rejects host methods and inherited engine accessors or fields', async () => {
		expect((await check('btnClose(): void {}')).join('\n')).toMatch(/btnClose.*conflict/i);
		expect((await check('', '<Button id="enabled" />')).join('\n')).toMatch(/enabled.*conflict/i);
	});

	it('validates declarations inherited from application base classes', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-part-inherit-'));
		temporary.push(root);
		const project = await createPartFieldProject(root, `
import { Component, Label } from '@kurot/ui';
class Base extends Component { declare btnClose: Label; }
export class View extends Base { constructor() { super(); this.skinName = 'skins.ViewSkin'; } }
`);
		const skins = [parseToIR('<Skin xmlns="https://kurot.dev/ui/1" class="skins.ViewSkin"><Button id="btnClose" /></Skin>')];
		const issues = await validateSkinPartFields(project, skins, await generateSkinPartsDeclaration(project, skins));
		expect(issues.some(issue => /btnClose.*(?:type|assign)/i.test(issue.message))).toBe(true);
	});

	it('recognizes SDK native slots while rejecting their wrong types', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-native-part-'));
		temporary.push(root);
		const project = await createPartFieldProject(root, 'export class View {}');
		for (const tag of ['Label', 'Rect']) {
			const skins = [parseToIR(`<Skin xmlns="https://kurot.dev/ui/1" class="skins.ButtonSkin"><${tag} id="labelDisplay" /></Skin>`)];
			const issues = await validateSkinPartFields(project, skins, await generateSkinPartsDeclaration(project, skins));
			expect(issues.length > 0).toBe(tag === 'Rect');
		}
	});

	it('requires a UI implementation supporting direct skin fields', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-old-ui-parts-'));
		temporary.push(root);
		const project = await createPartFieldProject(root, `
import { Component, Button } from '@kurot/ui';
export class View extends Component<'skins.ViewSkin'> { declare btnClose: Button; }
`);
		const file = 'node_modules/@kurot/ui/index.d.ts';
		const source = await fs.readFile(path.join(root, file), 'utf8');
		await writePartFile(root, file, source.replace(/^.*protected getSkinPartValidator.*\n/m, ''));
		const skins = [parseToIR('<Skin xmlns="https://kurot.dev/ui/1" class="skins.ViewSkin"><Button id="btnClose" /></Skin>')];
		const issues = await validateSkinPartFields(project, skins, await generateSkinPartsDeclaration(project, skins));
		expect(issues.some(issue => /ui.*4\.0\.0/i.test(issue.message))).toBe(true);
	});

	it('does not permit declare to shadow an inherited engine member', async () => {
		expect((await check('declare enabled: Button;', '<Button id="enabled" />')).join('\n')).toMatch(/enabled.*conflict/i);
	});

	it('requires inherited declared parts in every statically associated skin', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-variant-parts-'));
		temporary.push(root);
		const project = await createPartFieldProject(root, `
import { Component, Button } from '@kurot/ui';
class Base extends Component { declare btnClose: Button; }
export class View extends Base {
  constructor() { super(); this.skinName = 'skins.First'; }
  change(): void { this.skinName = 'skins.Second'; }
}
`);
		const skins = [
			parseToIR('<Skin xmlns="https://kurot.dev/ui/1" class="skins.First"><Button id="btnClose" /></Skin>'),
			parseToIR('<Skin xmlns="https://kurot.dev/ui/1" class="skins.Second" />'),
		];
		const issues = await validateSkinPartFields(project, skins, await generateSkinPartsDeclaration(project, skins));
		expect(issues.some(issue => issue.skinName === 'skins.Second' && /btnClose.*missing/i.test(issue.message))).toBe(true);
	});

	it('uses syntax for generic unions without treating comments or strings as skin assignments', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-skin-syntax-'));
		temporary.push(root);
		const project = await createPartFieldProject(root, `
import { Component, Button } from '@kurot/ui';
export class View extends Component<'skins.First' | 'skins.Second'> {
  // this.skinName = 'skins.Wrong';
  notes = "this.skinName = 'skins.Wrong'";
  declare btnClose: Button;
}
`);
		const skins = ['First', 'Second'].map(name =>
			parseToIR(`<Skin xmlns="https://kurot.dev/ui/1" class="skins.${name}"><Button id="btnClose" /></Skin>`),
		);
		const declaration = await generateSkinPartsDeclaration(project, skins);
		expect(declaration).not.toContain('interface View');
		expect(await validateSkinPartFields(project, skins, declaration)).toEqual([]);
	});
});
