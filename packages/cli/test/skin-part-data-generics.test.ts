import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseToIR } from '../src/core/kui/index.js';
import { generateSkinPartsDeclaration } from '../src/core/kui/skin-parts-declaration.js';
import { validateSkinPartFields } from '../src/core/kui/validate-skin-part-fields.js';
import { createPartFieldProject, writePartFile } from './helpers/part-field-project.js';

const temporary: string[] = [];
const genericSDK = `
export declare class DataGroup<T = unknown> extends Component {
  dataProvider?: { getItemAt(index: number): T | undefined };
  itemRendererFunction?: (item: T | undefined) => unknown;
}
export declare class ListBase<T = unknown> extends DataGroup<T> { selectedItem: T | undefined; }
export declare class List<T = unknown> extends ListBase<T> { private rendererHandlers: object; }
export declare class TabBar<T = unknown> extends ListBase<T> { private rendererHandlers: object; }
export declare class ComboBox<T = unknown> extends Component {
  selectedItem: T | undefined;
  labelFunction?: (item: T) => string;
}
export declare class ItemRenderer<TSkin extends string = string, T = unknown> extends Component<TSkin> {
  data: T | undefined;
}
`;

afterEach(async () => {
	await Promise.all(temporary.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});

async function check(
	tag: string,
	field: string,
	extra = '',
	sdk = genericSDK,
	base = "Component<'skins.ViewSkin'>",
): Promise<readonly string[]> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-part-data-types-'));
	temporary.push(root);
	const project = await createPartFieldProject(
		root,
		`
import { Component, Label, List, DataGroup, ListBase, ComboBox, TabBar, ItemRenderer } from '@kurot/ui';
interface ItemData { id: number; }
${extra}
export class View extends ${base} { ${field} }
`,
	);
	const file = path.join(root, 'node_modules/@kurot/ui/index.d.ts');
	await writePartFile(root, 'node_modules/@kurot/ui/index.d.ts', (await fs.readFile(file, 'utf8')) + sdk);
	const skins = [
		parseToIR(`<Skin xmlns="https://kurot.dev/ui/1" class="skins.ViewSkin"><${tag} id="items" /></Skin>`),
	];
	const declaration = await generateSkinPartsDeclaration(project, skins);
	return (await validateSkinPartFields(project, skins, declaration)).map(issue => issue.message);
}

describe('generic data Skin fields', () => {
	it.each(['DataGroup', 'List', 'TabBar', 'ComboBox'])('accepts %s item types absent from XML', async tag => {
		expect(await check(tag, `declare items: ${tag}<ItemData | null>;`)).toEqual([]);
	});

	it('accepts optional aliases and an inherited native data-container type', async () => {
		expect(await check('List', 'declare items?: Items;', 'type Items = List<ItemData | null>;')).toEqual([]);
		expect(await check('List', 'declare items: DataGroup<ItemData | null>;')).toEqual([]);
		expect(await check('List', 'declare items: ListBase<ItemData | null>;')).toEqual([]);
	});

	it('accepts ItemRenderer data while retaining its first Skin argument', async () => {
		expect(await check('ItemRenderer', 'declare items: ItemRenderer<string, ItemData | null>;')).toEqual([]);
	});

	it.each([
		['List', 'Label'],
		['List', 'TabBar<ItemData>'],
		['DataGroup', 'List<ItemData>'],
		['ComboBox', 'List<ItemData>'],
		['List', 'List<ItemData> & { requiredMethod(): void }'],
	])('continues rejecting %s as %s', async (tag, type) => {
		expect((await check(tag, `declare items: ${type};`)).join('\n')).toMatch(/not assignable/);
	});

	it('does not erase constraints from a project subclass or a class with the same short name', async () => {
		expect(
			(
				await check(
					'List',
					'declare items: CustomList<ItemData>;',
					'class CustomList<T> extends List<T> { requiredMethod(): void {} }',
				)
			).join('\n'),
		).toMatch(/not assignable/);
		expect(
			(
				await check(
					'List',
					'declare items: Shadow.List<ItemData>;',
					'namespace Shadow { export class List<T> extends DataGroup<T> { requiredMethod(): void {} } }',
				)
			).join('\n'),
		).toMatch(/not assignable/);
	});

	it('does not erase an authored Skin type when matching renderer data', async () => {
		const sdk = genericSDK.replace('TSkin extends string = string, T', 'TSkin extends string = "base", T');
		expect(
			(await check('ItemRenderer', 'declare items: ItemRenderer<"other", ItemData>;', '', sdk)).join('\n'),
		).toMatch(/not assignable/);
	});

	it('does not erase a non-unknown authored item type', async () => {
		const sdk = genericSDK.replace('class List<T = unknown>', 'class List<T = number>');
		expect((await check('List', 'declare items: List<ItemData>;', '', sdk)).join('\n')).toMatch(/not assignable/);
	});

	it('validates typed inherited native slots without admitting a wrong control', async () => {
		const extra = `class NativeHost extends Component<'skins.ViewSkin'> {
  /** @skinPart */
  items?: List<ItemData>;
}`;
		expect(await check('List', '', extra, genericSDK, 'NativeHost')).toEqual([]);
		expect((await check('Label', '', extra, genericSDK, 'NativeHost')).join('\n')).toMatch(/not assignable/);
	});

	it('retains missing, emitted and conflicting field validation', async () => {
		expect((await check('List', 'declare absent: List<ItemData>;')).join('\n')).toMatch(/missing/);
		expect((await check('List', 'items?: List<ItemData>;')).join('\n')).toMatch(/declare/);
		expect((await check('List', 'items(): void {}')).join('\n')).toMatch(/conflict/);
	});
});
