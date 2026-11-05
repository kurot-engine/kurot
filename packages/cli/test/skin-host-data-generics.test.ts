import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectSkinHosts } from '../src/core/kui/skin-hosts.js';
import { createPartFieldProject } from './helpers/part-field-project.js';

const temporary: string[] = [];
afterEach(async () => {
	await Promise.all(temporary.splice(0).map(root => fs.rm(root, { recursive: true, force: true })));
});
async function names(source: string): Promise<readonly string[]> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kurot-data-skin-hosts-'));
	temporary.push(root);
	const project = await createPartFieldProject(root, source);
	const hosts = await collectSkinHosts(project, path.join(root, '.kurot/skin-parts.d.ts'), [
		'skins.Row',
		'skins.Data',
	]);
	return hosts.flatMap(host => host.skinNames);
}

describe('Skin arguments and business-data arguments', () => {
	it.each([
		'List',
		'DataGroup',
		'ListBase',
		'TabBar',
		'ComboBox',
		'ArrayCollection',
		'ItemTapEvent',
		'CollectionEvent',
	])('does not interpret %s data literals as Skin names', async name => {
		expect(
			await names(`import { ${name} } from '@kurot/ui'; export class View extends ${name}<'skins.Data'> {}`),
		).toEqual([]);
	});
	it('handles named aliases, namespace imports and collection interfaces', async () => {
		expect(
			await names(
				"import { List as NativeList } from '@kurot/ui'; export class View extends NativeList<'skins.Data'> {}",
			),
		).toEqual([]);
		expect(
			await names("import * as UI from '@kurot/ui'; export class View extends UI.List<'skins.Data'> {}"),
		).toEqual([]);
		expect(
			await names(
				"import type { ICollection } from '@kurot/ui'; export class View implements ICollection<'skins.Data'> {}",
			),
		).toEqual([]);
	});
	it('retains ItemRenderer first Skin argument and ignores its second data argument', async () => {
		expect(
			await names(
				"import { ItemRenderer as Row } from '@kurot/ui'; export class View extends Row<'skins.Row', 'skins.Data'> {}",
			),
		).toEqual(['skins.Row']);
		expect(
			await names(
				"import * as UI from '@kurot/ui'; export class View extends UI.ItemRenderer<'skins.Row', 'skins.Data'> {}",
			),
		).toEqual(['skins.Row']);
	});
	it('preserves Component and project-base Skin discovery without class-name guessing', async () => {
		expect(
			await names("import { Component } from '@kurot/ui'; export class View extends Component<'skins.Row'> {}"),
		).toEqual(['skins.Row']);
		expect(
			await names("import { List } from './project-base.js'; export class View extends List<'skins.Row'> {}"),
		).toEqual(['skins.Row']);
	});
});
