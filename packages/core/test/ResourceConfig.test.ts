import { describe, expect, it } from 'vitest';
import { ResourceConfig } from '../src/kurot/resource/ResourceConfig.js';
import type { ResourceConfigData, ResourceConfigEntry } from '../src/kurot/resource/ResourceConfig.js';

describe('object subkey configuration', () => {
	it('maps frames to one parent and deduplicates group dependencies', () => {
		const config = new ResourceConfig();
		const atlas = {
			name: 'atlas',
			type: 'sheet',
			url: 'atlas.json',
			subkeys: { a: { scale9grid: '1,2,3,4' }, b: {} },
		};
		config.parseConfig({ resources: [atlas], groups: [{ name: 'main', keys: 'a,b,atlas' }] }, 'resource/');
		expect(config.getResourceItem('a')?.name).toBe('atlas');
		expect(config.getResourceItem('a')?.url).toBe('resource/atlas.json');
		expect(config.getGroupByName('main').map(item => item.name)).toEqual(['atlas']);
		expect(atlas.subkeys.a.scale9grid).toBe('1,2,3,4');
	});
	it.each(['a,b', '', false, null, [], { a: 'bad' }, { ' a': {} }, { 'a,b': {} }])(
		'rejects %j before registering any entry or changing its URL',
		subkeys => {
			const config = new ResourceConfig();
			const valid = { name: 'valid', type: 'text', url: 'valid.txt' };
			const raw: unknown = {
				resources: [valid, { name: 'atlas', type: 'sheet', url: 'atlas.json', subkeys }],
				groups: [],
			};
			expect(() => config.parseConfig(raw as ResourceConfigData, 'resource/')).toThrow();
			expect(config.hasKey('valid')).toBe(false);
			expect(config.hasKey('atlas')).toBe(false);
			expect(valid.url).toBe('valid.txt');
			const item: unknown = { name: 'atlas', type: 'sheet', url: 'atlas.json', subkeys };
			expect(() => config.addItem(item as ResourceConfigEntry)).toThrow();
			expect(config.hasKey('atlas')).toBe(false);
		},
	);
	it('lets a real resource identity win over a previous bare frame alias', () => {
		const config = new ResourceConfig();
		config.parseConfig(
			{
				resources: [
					{ name: 'atlas', type: 'sheet', url: 'a.json', subkeys: { a: {} } },
					{ name: 'a', type: 'image', url: 'a.png' },
				],
				groups: [],
			},
			'',
		);
		expect(config.getResourceItem('a')?.name).toBe('a');
		expect(config.getType('a')).toBe('image');
	});
});
