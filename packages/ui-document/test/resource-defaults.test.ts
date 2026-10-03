import { describe, expect, it } from 'vitest';
import {
	createUIAssetContract,
	createUIDocument,
	createUINode,
	createUIResourceReference,
	matchesUIPropertyDefinition,
	getUIResourceNineSlice,
	parseUIDocument,
	parseUIResourceConfigEntries,
	parseUINineSliceGrid,
	resolveUIResourceDefaults,
	serializeUIDocument,
} from '../src/index.js';

const resources = parseUIResourceConfigEntries({
	resources: [
		{
			name: 'atlas',
			type: 'sheet',
			url: 'atlas.json',
			subkeys: { panel: { scale9grid: '2,3,10,11', custom: 7 }, plain: {} },
		},
		{ name: 'logo', type: 'image', url: 'logo.png', scale9grid: '1,2,3,4' },
	],
});

describe('resource defaults', () => {
	it('reads canonical objects without losing metadata and resolves both frame aliases', () => {
		expect(resources[0]?.subkeys?.panel?.custom).toBe(7);
		expect(getUIResourceNineSlice(resources, 'panel')).toEqual({ x: 2, y: 3, width: 10, height: 11 });
		expect(getUIResourceNineSlice(resources, 'atlas.panel')).toEqual(getUIResourceNineSlice(resources, 'panel'));
		expect(getUIResourceNineSlice(resources, 'logo')).toEqual({ x: 1, y: 2, width: 3, height: 4 });
		expect(getUIResourceNineSlice(resources, 'plain')).toBeUndefined();
		expect(getUIResourceNineSlice(resources, 'missing')).toBeUndefined();
	});
	it('prefers exact resource names and first bare frame identities over qualified aliases', () => {
		const entries = [
			...resources,
			{ name: 'panel', type: 'text', url: 'panel.txt' },
			{ name: 'other', type: 'sheet', url: 'x.json', subkeys: { panel: { scale9grid: '0,0,1,1' } } },
		];
		expect(getUIResourceNineSlice(entries, 'panel')).toBeUndefined();
		expect(getUIResourceNineSlice(entries, 'other.panel')).toEqual({ x: 0, y: 0, width: 1, height: 1 });
	});
	it.each(['panel', '', false, null, [], { panel: 4 }, { ' panel': {} }, { 'a,b': {} }])(
		'rejects invalid/legacy subkeys %j',
		subkeys => {
			expect(() =>
				parseUIResourceConfigEntries({ resources: [{ name: 'a', type: 'sheet', url: 'a.json', subkeys }] }),
			).toThrow();
		},
	);
	it.each(['1,2,0,3', '-1,0,2,3', '1,,2,3', 'NaN,0,2,3', '1,2,3', '1,2,3,4,5'])('rejects invalid grid %s', grid => {
		expect(() => parseUINineSliceGrid(grid)).toThrow();
	});
	it('keeps authored XML immutable and gives local overrides priority', () => {
		const document = parseUIDocument(
			'<Skin xmlns="https://kurot.dev/ui/1" class="Test"><Image id="default" source="panel"/><Image id="local" source="panel" scale9Grid="1,1,2,2"/><Image id="off" source="panel" scale9Grid="false"/></Skin>',
		);
		const before = serializeUIDocument(document);
		const resolved = resolveUIResourceDefaults(document, resources);
		expect(resolved.root.children[0]?.properties.scale9Grid).toEqual({ x: 2, y: 3, width: 10, height: 11 });
		expect(resolved.root.children[1]?.properties.scale9Grid).toEqual({ x: 1, y: 1, width: 2, height: 2 });
		expect(resolved.root.children[2]?.properties.scale9Grid).toBe(false);
		expect(serializeUIDocument(document)).toBe(before);
		expect(serializeUIDocument(parseUIDocument(before))).toBe(before);
	});
	it('pairs state and variant source changes, clears ordinary textures, and preserves explicit state overrides', () => {
		const document = createUIDocument({
			id: 'test',
			root: createUINode({
				id: 'root',
				type: 'kui.Group',
				children: [
					createUINode({
						id: 'image',
						type: 'kui.Image',
						properties: { source: createUIResourceReference('image', 'panel') },
					}),
				],
			}),
			contract: createUIAssetContract({
				states: {
					ordinary: { overrides: [{ targetId: 'image', property: 'source', value: 'plain' }] },
					custom: {
						overrides: [
							{ targetId: 'image', property: 'source', value: 'logo' },
							{ targetId: 'image', property: 'scale9Grid', value: false },
						],
					},
				},
				variants: { logo: { overrides: [{ targetId: 'image', property: 'source', value: 'logo' }] } },
			}),
		});
		const resolved = resolveUIResourceDefaults(document, resources);
		expect(resolved.contract.states.ordinary?.overrides.at(-1)).toEqual({
			targetId: 'image',
			property: 'scale9Grid',
			value: false,
		});
		expect(resolved.contract.states.custom?.overrides).toHaveLength(2);
		expect(resolved.contract.variants.logo?.overrides.at(-1)?.value).toEqual({ x: 1, y: 2, width: 3, height: 4 });
		expect(document.contract.states.ordinary?.overrides).toHaveLength(1);
	});
	it('rejects true as a rectangle while allowing explicit false', () => {
		expect(matchesUIPropertyDefinition(true, { valueType: ['object', 'boolean'], format: 'rectangle' })).toBe(
			false,
		);
		expect(matchesUIPropertyDefinition(false, { valueType: ['object', 'boolean'], format: 'rectangle' })).toBe(
			true,
		);
	});
});
